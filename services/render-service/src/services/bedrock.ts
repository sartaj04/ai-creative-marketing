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
import type { TemplateJSON, AnalyzeResponse, TextAnalyzeResponse, VisionComparisonResult } from '../types/template.js';

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
const POST_SYSTEM_PROMPT = `You are a high-precision layout extraction AI. Analyze the provided image and generate a pixel-perfect Satori-compatible template JSON.


SATORI CSS CONSTRAINTS (CRITICAL - violations cause render failures):

SUPPORTED CSS PROPERTIES:
- Layout: display (flex, none ONLY), flexDirection, flexWrap, flexGrow, flexShrink, flexBasis, alignItems, alignContent, alignSelf, justifyContent, gap
- Position: position (relative, absolute), top, right, bottom, left
- Sizing: width, height, minWidth, minHeight, maxWidth, maxHeight
- Spacing: margin, marginTop/Right/Bottom/Left, padding, paddingTop/Right/Bottom/Left
- Border: border, borderWidth, borderStyle (solid, dashed), borderColor, borderRadius
- Background: backgroundColor, backgroundImage (linear-gradient ONLY), backgroundSize, backgroundPosition
- Typography: color, fontSize, fontWeight, fontFamily, fontStyle, textAlign, textTransform, lineHeight, letterSpacing, whiteSpace, wordBreak, textOverflow
- Other: opacity, boxShadow, overflow, objectFit, objectPosition

NOT SUPPORTED (DO NOT USE - will crash renderer):
- display: grid, inline-block, inline-flex, inline
- z-index (use DOM order instead)
- filter, backdrop-filter
- transform with 3D (translate3d, rotate3d, scale3d, perspective)
- calc() function
- repeating-linear-gradient (use linear-gradient instead)
- radial-gradient
- transparent keyword (use rgba(0,0,0,0) instead)
- currentColor in non-color properties
- min-content, max-content, fit-content
- animation, transition
- @keyframes

DETECTION RULES:
1. BACKGROUND: 
   - If the image uses a photo/texture background, set "hasBackgroundImage": true.
   - Generate a semantic "searchQuery" (e.g. "minimalist office desk top view", "dark green grunge texture") that describes it.
   - Use "backgroundImage": "url('{{background}}')" in the root container style.
2. TEXT STRUCTURE:
   - Identify visually distinct text blocks. DO NOT merge separate lines or headings into one block unless they are clearly a single paragraph.
   - If text has different sizes/weights/colors, SPLIT it into separate children elements.
   - Maintain the original visual hierarchy.
3. CONTENT IMAGES: For any embedded photos or graphics that are NOT the background, use an <img> tag with src="{{image}}".
4. PLACEHOLDER TEXT: Replace all text content with {{placeholders}} like {{headline}}, {{subtitle}}, {{body}}, {{cta}}, {{author}}.

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
        "backgroundColor": "#hexcode",
        "backgroundImage": "url('{{background}}')"
      }
    },
    "children": [ /* nested elements */ ]
  },
  "analysis": {
    "detectedElements": ["headline", "subtext", "image", etc.],
    "colorPalette": ["#hex1", "#hex2", ...],
    "fonts": ["font1", "font2", ...],
    "hasBackgroundImage": boolean,
    "searchQuery": "string description for background image search"
  }
}

RULES:
1. Use ONLY flexbox (display: flex) - NO GRID
2. Use numeric values for font sizes (e.g., 48 not "48px")
3. Do NOT include actual text content - replace with {{placeholders}}
4. Colors must be hex codes or rgba()
5. All dimension values should be numbers for pixels or strings for percentages

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
2. PLACEHOLDERS: Replace all specific details with descriptive placeholders in curly braces like {Topic}, {Industry}, {Hook}, {Outcome}.
3. NAMING: Provide a clear, professional name for this format.
4. DESCRIPTION: Provide a 1-sentence description of when to use this format.
5. CONTEXT DETECTION:
   - Detect the PLATFORM: "linkedin", "twitter", "instagram", or "general".
   - Detect the POST TYPE: "thread" (multi-tweet), "carousel" (slide content), "standard" (single post), or "reel".

OUTPUT FORMAT:
Return ONLY valid JSON matching this schema:
{
  "format": "string", // The full text with {Placeholders}
  "name": "string",   // Suggested name
  "description": "string",
  "platform": "linkedin" | "twitter" | "instagram" | "general",
  "postType": "thread" | "carousel" | "standard" | "reel",
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
            platform: parsed.platform || 'general',
            postType: parsed.postType || 'standard',
            variables: parsed.variables,
        };
    } catch (error) {
        logger.error('Claude text analysis failed', error);
        throw new Error(`Text analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Vision comparison prompt for scoring rendered vs original
 */
const VISION_COMPARISON_PROMPT = `You are a pixel-perfect design comparison AI. Compare two images:
1. ORIGINAL: The reference design the user uploaded
2. RENDERED: The template we generated and rendered

Score each dimension 0-100:
- layout: Element positioning, hierarchy, proportions, overall structure
- colors: Color accuracy, gradients, backgrounds, text colors
- typography: Font sizes, weights, line heights, text styling, alignment
- spacing: Margins, padding, gaps between elements
- overall: Weighted average (layout 30%, colors 25%, typography 25%, spacing 20%)

OUTPUT FORMAT (JSON only):
{
  "scores": {
    "layout": number,
    "colors": number,
    "typography": number,
    "spacing": number,
    "overall": number
  },
  "issues": [
    "Specific issue 1 - be precise about what's wrong",
    "Specific issue 2"
  ],
  "suggestedFixes": [
    "Exact CSS property change needed (e.g., 'fontSize should be 48 not 32')",
    "Another specific fix"
  ],
  "detailedAnalysis": "2-3 sentence summary of major differences"
}

SCORING GUIDELINES:
- 90-100: Nearly identical, minor differences
- 70-89: Good match, some noticeable differences
- 50-69: Recognizable as same design, significant issues
- Below 50: Major structural or visual problems

Focus on Satori-compatible fixes. Be strict - if layout structure is wrong, score below 70.`;

/**
 * Template fix prompt for requesting improvements
 */
const TEMPLATE_FIX_PROMPT = `You are a Satori template repair AI. Fix the template based on the comparison results.

SATORI CSS CONSTRAINTS (must follow):
- Use ONLY display: flex (NO grid)
- No z-index, filter, backdrop-filter
- No transform3d, perspective
- No repeating-linear-gradient (use linear-gradient)
- No transparent keyword (use rgba(0,0,0,0))
- No calc() functions
- Use numeric values for font sizes
- Use hex colors or rgba()

You will receive:
1. The ORIGINAL image (reference)
2. The RENDERED output (current result)
3. The CURRENT template JSON
4. List of ISSUES identified
5. SUGGESTED FIXES

Your task: Return ONLY the corrected template JSON that addresses the issues while maintaining Satori compatibility.

OUTPUT: Return ONLY the template JSON object, no explanation or wrapper.`;

/**
 * Compare original image with rendered output using Claude vision
 */
export async function compareImages(
    originalBuffer: Buffer,
    renderedBuffer: Buffer,
    originalMimeType: string = 'image/png'
): Promise<VisionComparisonResult> {
    logger.info('Comparing images with Claude vision', {
        originalSize: originalBuffer.length,
        renderedSize: renderedBuffer.length,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contentBlocks: any[] = [
        {
            text: "Compare these two images. IMAGE 1 is the ORIGINAL design reference. IMAGE 2 is our RENDERED template output."
        },
        {
            image: {
                format: originalMimeType.split('/')[1] === 'jpeg' ? 'jpeg' : 'png',
                source: { bytes: originalBuffer },
            },
        },
        {
            text: "IMAGE 1 (ORIGINAL) shown above. IMAGE 2 (RENDERED) shown below:"
        },
        {
            image: {
                format: 'png',
                source: { bytes: renderedBuffer },
            },
        },
        {
            text: "Analyze the differences and provide scores according to the scoring guidelines."
        }
    ];

    try {
        const command = new ConverseCommand({
            modelId: env.bedrock.modelId,
            messages: [{ role: 'user', content: contentBlocks }],
            system: [{ text: VISION_COMPARISON_PROMPT }],
            inferenceConfig: { maxTokens: 2048, temperature: 0 },
        });

        const response = await bedrockClient.send(command);
        const content = response.output?.message?.content?.[0]?.text || '';
        const parsed = parseClaudeResponse(content);

        logger.info('Vision comparison complete', { overall: parsed.scores?.overall });

        return {
            scores: parsed.scores || { layout: 0, colors: 0, typography: 0, spacing: 0, overall: 0 },
            issues: parsed.issues || [],
            suggestedFixes: parsed.suggestedFixes || [],
            detailedAnalysis: parsed.detailedAnalysis || '',
        };
    } catch (error) {
        logger.error('Vision comparison failed', error);
        throw new Error(`Vision comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Request template fix from Claude based on comparison results
 */
export async function requestTemplateFix(
    originalBuffer: Buffer,
    renderedBuffer: Buffer,
    currentTemplate: TemplateJSON,
    issues: string[],
    suggestedFixes: string[],
    originalMimeType: string = 'image/png'
): Promise<TemplateJSON> {
    logger.info('Requesting template fix from Claude', {
        issueCount: issues.length,
        fixCount: suggestedFixes.length,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contentBlocks: any[] = [
        {
            text: `Fix this template to better match the original design.

ISSUES IDENTIFIED:
${issues.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

SUGGESTED FIXES:
${suggestedFixes.map((f, idx) => `${idx + 1}. ${f}`).join('\n')}

ORIGINAL IMAGE (reference):`
        },
        {
            image: {
                format: originalMimeType.split('/')[1] === 'jpeg' ? 'jpeg' : 'png',
                source: { bytes: originalBuffer },
            },
        },
    ];

    // Only include rendered image if we have one
    if (renderedBuffer.length > 0) {
        contentBlocks.push({
            text: "CURRENT RENDERED OUTPUT:"
        });
        contentBlocks.push({
            image: {
                format: 'png',
                source: { bytes: renderedBuffer },
            },
        });
    }

    contentBlocks.push({
        text: `CURRENT TEMPLATE JSON:
${JSON.stringify(currentTemplate, null, 2)}

Return the FIXED template JSON only. Apply the suggested fixes while ensuring Satori compatibility.`
    });

    try {
        const command = new ConverseCommand({
            modelId: env.bedrock.modelId,
            messages: [{ role: 'user', content: contentBlocks }],
            system: [{ text: TEMPLATE_FIX_PROMPT }],
            inferenceConfig: { maxTokens: 8192, temperature: 0 },
        });

        const response = await bedrockClient.send(command);
        const content = response.output?.message?.content?.[0]?.text || '';
        const parsed = parseClaudeResponse(content);

        logger.info('Template fix received');

        // Handle if Claude returns { template: ... } wrapper or direct template
        return parsed.template || parsed;
    } catch (error) {
        logger.error('Template fix request failed', error);
        throw new Error(`Template fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
