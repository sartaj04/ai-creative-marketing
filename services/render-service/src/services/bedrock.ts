/**
 * AWS Bedrock Claude Service
 * Image analysis and template generation using Claude 4.5 Sonnet via Bedrock
 */
import {
    BedrockRuntimeClient,
    ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { TemplateJSON, AnalyzeResponse, TextAnalyzeResponse } from '../types/template.js';

// Initialize Bedrock client with Bedrock-specific credentials
const bedrockClient = new BedrockRuntimeClient({
    region: env.bedrock.region,
    credentials: {
        accessKeyId: env.bedrock.accessKeyId,
        secretAccessKey: env.bedrock.secretAccessKey,
    },
});

/**
 * System prompts for template generation
 */
const POST_SYSTEM_PROMPT = `You are a high-precision layout extraction AI using Claude 4.5 Sonnet. Analyze the provided image and generate a pixel-perfect Satori-compatible template JSON.

DETECTION RULES:
1. BACKGROUND: If the image has a non-solid background (texture, photo, gradient), set "hasBackgroundImage": true and use "background-image: url('{{background}}')" in the root container style.
2. CONTENT IMAGES: For any embedded photos or graphics that are NOT the background, use an <img> tag with src="{{image}}".

OUTPUT FORMAT:
Return ONLY valid JSON matching this schema:
{
  "template": {
    "type": "div",
    "props": {
      "style": { 
        "display": "flex",
        "flexDirection": "column",
        "width": "100%",
        "height": "100%",
        "backgroundColor": "#hex",
        "backgroundImage": "url('{{background}}')" // Only if hasBackgroundImage is true
      }
    },
    "children": [ /* nested elements with {{headline}}, {{image}} placeholders */ ]
  },
  "analysis": {
    "detectedElements": ["headline", "subtext", "image", etc.],
    "colorPalette": ["#hex1", "#hex2", ...],
    "fonts": ["font1", "font2", ...],
    "hasBackgroundImage": boolean
  }
}

CONSTRAINTS:
1. Use ONLY flexbox (display: flex).
2. Use absolute pixels for font sizes (e.g., 48px).
3. Do NOT include actual text content - replace with {{placeholders}}.
4. Colors must be hex codes.

Return ONLY the JSON object.`;

const STRUCTURE_PROMPT = `You are an expert design analyst.
Task: Analyze the PDF carousel and map each page to a specific Layout Type.
Identify identical or highly similar layouts (e.g., repeating content slides) and group them under the same 'layoutId'.

OUTPUT JSON ONLY:
{
  "pages": [
    { "page": 1, "layoutId": "layout_intro", "type": "intro" },
    { "page": 2, "layoutId": "layout_content_a", "type": "content" },
    { "page": 3, "layoutId": "layout_content_a", "type": "content" }
  ],
  "commonAnalysis": {
    "colorPalette": ["#hex1", "#hex2"],
    "fonts": ["font1", "font2"]
  }
}`;

const PAGE_PROMPT = (pageNum: number) => `You are a high-precision layout extraction AI.
Task: Analyze ONLY PAGE ${pageNum} of the provided PDF.
Generate the pixel-perfect Satori-compatible template JSON for this specific page.

DETECTION RULES:
1. BACKGROUND: If non-solid background, use "backgroundImage": "url('{{background}}')" in root.
2. CONTENT IMAGES: Use <img> with src="{{image}}".

OUTPUT JSON ONLY (Schema):
{
  "template": { /* Satori specific JSON */ },
  "analysis": { "hasBackgroundImage": boolean, "detectedElements": [] }
}

CONSTRAINTS:
1. Use ONLY flexbox.
2. Use placeholders {{headline}}, {{cta}}, {{slide_number}}.
3. Minify JSON.`;

const TEXT_SYSTEM_PROMPT = `You are a world-class social media copywriter and content strategist. 
Your task is to analyze a provided social media post (or post idea) and extract its underlying "Copy Format" or "Template".

RULES:
1. STRUCTURE: Keep the exact structure, emojis, line breaks, and punctuation of the original text.
2. PLACEHOLDERS: Replace all specific details (entities, locations, specific numbers that aren't part of the format, product names, industry-specific terms) with descriptive placeholders in curly braces like {Topic}, {Industry}, {Hook}, {Outcome}, {Specific_Detail}.
3. NAMING: Provide a clear, professional name for this format (e.g., "Educational Myth-Buster", "Result-Oriented Promotional Hook").
4. DESCRIPTION: Provide a 1-sentence description of when to use this format.
5. VARIABLES: List all unique placeholder names used in the format.

OUTPUT FORMAT:
Return ONLY valid JSON matching this schema:
{
  "format": "string", // The full text with {Placeholders}
  "name": "string",   // Suggested name
  "description": "string", // 1-sentence usage description
  "variables": [
    { "name": "Topic", "type": "text" },
    ...
  ]
}

Return ONLY the JSON object.`;

/**
 * Analyze an image or PDF and generate template JSON using Claude
 */
export async function analyzeImage(
    contentBuffer: Buffer,
    options: {
        width?: number;
        height?: number;
        mimeType?: string;
    } = {}
): Promise<AnalyzeResponse> {
    const {
        width = 1080,
        height = 1080,
        mimeType = 'image/png',
    } = options;

    logger.info('Analyzing content with Claude', {
        modelId: env.bedrock.modelId,
        contentSize: contentBuffer.length,
        mimeType,
        targetSize: `${width}x${height}`,
    });

    // Prepare content blocks for Converse API
    const contentBlocks: any[] = [];
    const isPdf = mimeType === 'application/pdf';

    if (isPdf) {
        contentBlocks.push({
            document: {
                format: 'pdf',
                name: 'template_source',
                source: {
                    bytes: contentBuffer, // SDK handles Buffer/Uint8Array
                },
            },
        });

        // --- Multi-step PDF Analysis ---
        try {
            // Step 1: Analyze Structure
            logger.info('Step 1: Analyzing PDF structure...');
            const structureCommand = new ConverseCommand({
                modelId: env.bedrock.modelId,
                messages: [{ role: 'user', content: [...contentBlocks, { text: "Analyze the structure of this PDF carousel." }] }],
                system: [{ text: STRUCTURE_PROMPT }],
                inferenceConfig: { maxTokens: 4096, temperature: 0 },
            });
            const structRes = await bedrockClient.send(structureCommand);
            const structJson = parseClaudeResponse(structRes.output?.message?.content?.[0]?.text || '');

            logger.info(`Structure identified: ${structJson.pages.length} pages, ${new Set(structJson.pages.map((p: any) => p.layoutId)).size} unique layouts.`);

            // Step 2: Extract Unique Layouts in Parallel
            const uniqueLayouts = new Map<string, any>();
            const layoutPromises = [];

            // Find first occurrence of each layoutId
            const uniquePages = new Map<string, number>(); // layoutId -> pageNum
            for (const p of structJson.pages) {
                if (!uniquePages.has(p.layoutId)) {
                    uniquePages.set(p.layoutId, p.page);
                }
            }

            for (const [layoutId, pageNum] of uniquePages.entries()) {
                layoutPromises.push(async () => {
                    logger.info(`Analyzing Layout '${layoutId}' (Source: Page ${pageNum})...`);
                    const pageCommand = new ConverseCommand({
                        modelId: env.bedrock.modelId,
                        messages: [{ role: 'user', content: [...contentBlocks, { text: `Analyze Page ${pageNum} only.` }] }],
                        system: [{ text: PAGE_PROMPT(pageNum) }],
                        inferenceConfig: { maxTokens: 4096, temperature: 0 },
                    });
                    const pageRes = await bedrockClient.send(pageCommand);
                    const pageJson = parseClaudeResponse(pageRes.output?.message?.content?.[0]?.text || '');
                    uniqueLayouts.set(layoutId, pageJson);
                });
            }

            // Run parallel extractions
            await Promise.all(layoutPromises.map(fn => fn()));

            // Step 3: Reconstruct Deck
            const fullSlides = structJson.pages.map((p: any) => {
                const layoutData = uniqueLayouts.get(p.layoutId);
                return {
                    page: p.page,
                    template: layoutData.template,
                    analysis: layoutData.analysis
                };
            });

            return {
                success: true,
                slides: fullSlides,
                commonAnalysis: structJson.commonAnalysis
            };

        } catch (error) {
            logger.error('PDF Analysis failed', error);
            throw error;
        }
    } else {
        // --- Single Image Analysis ---
        contentBlocks.push({
            image: {
                format: mimeType.split('/')[1] === 'jpeg' ? 'jpeg' : 'png',
                source: {
                    bytes: contentBuffer,
                },
            },
        });
        contentBlocks.push({
            text: `Analyze this image and generate a Satori template JSON. Target dimensions: ${width}x${height} pixels.`,
        });

        try {
            const command = new ConverseCommand({
                modelId: env.bedrock.modelId,
                messages: [{ role: 'user', content: contentBlocks }],
                system: [{ text: POST_SYSTEM_PROMPT }],
                inferenceConfig: { maxTokens: 4096, temperature: 0 },
            });

            const response = await bedrockClient.send(command);
            const content = response.output?.message?.content?.[0]?.text || '';
            const parsed = parseClaudeResponse(content);

            return {
                success: true,
                template: parsed.template,
                analysis: parsed.analysis,
            };
        } catch (error) {
            logger.error('Full Cloud Analysis failed', error);
            throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

/**
 * Parse Claude's response and extract template JSON
 */
function parseClaudeResponse(content: string): any {
    const cleanContent = content.trim();

    try {
        // Try to parse directly as JSON
        const parsed = JSON.parse(cleanContent);
        return parsed; // Caller deals with validation
    } catch (e) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = cleanContent.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch && jsonMatch[1].trim() !== cleanContent) {
            return parseClaudeResponse(jsonMatch[1].trim());
        }

        // Try to find first { and last } to extract JSON object
        const firstBrace = cleanContent.indexOf('{');
        const lastBrace = cleanContent.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1) {
            const extracted = cleanContent.substring(firstBrace, lastBrace + 1);
            if (extracted !== cleanContent) {
                return parseClaudeResponse(extracted);
            }
        }

        logger.error('Failed to parse Claude response', undefined, { content });
        throw new Error('Failed to parse template from Claude response: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
}

/**
 * Check if Bedrock credentials are configured
 */
export function isBedrockConfigured(): boolean {
    return !!(
        env.bedrock.accessKeyId &&
        env.bedrock.secretAccessKey &&
        env.bedrock.region
    );
}

/**
 * Analyze text to extract a reusable post format
 */
export async function analyzeText(text: string): Promise<TextAnalyzeResponse> {
    logger.info('Analyzing text format with Claude', {
        modelId: env.bedrock.modelId,
        textLength: text.length,
    });

    try {
        const command = new ConverseCommand({
            modelId: env.bedrock.modelId,
            messages: [
                {
                    role: 'user',
                    content: [{ text: `Extract the post format from this text: \n\n${text}` }],
                },
            ],
            system: [{ text: TEXT_SYSTEM_PROMPT }],
            inferenceConfig: {
                maxTokens: 2048,
                temperature: 0,
            },
        });

        const response = await bedrockClient.send(command);
        const content = response.output?.message?.content?.[0]?.text || '';

        logger.debug('Claude text response', { content: content.substring(0, 500) });

        const parsed = parseClaudeResponse(content);

        return {
            success: true,
            format: parsed.format,
            name: parsed.name,
            description: parsed.description,
            variables: parsed.variables,
        };
    } catch (error) {
        logger.error('Claude text analysis failed', error);
        throw new Error(`Text analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
