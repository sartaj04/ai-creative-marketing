/**
 * Iterative Template Analyzer Service
 * Agentic loop for self-healing template generation
 */
import { analyzeImage, compareImages, requestTemplateFix } from './bedrock.js';
import { renderTemplate, sanitizeTemplate } from './satori-renderer.js';
import { logger } from '../utils/logger.js';
import type {
    TemplateJSON,
    IterativeAnalyzeResponse,
    IterativeAnalyzeOptions,
    IterationLog,
    ComparisonScore,
} from '../types/template.js';

const DEFAULT_TARGET_SCORE = 85;
const DEFAULT_MAX_ITERATIONS = 5;

/**
 * Extract placeholder variables from template
 */
function extractVariables(template: TemplateJSON): string[] {
    const vars = new Set<string>();
    const pattern = /\{\{(\w+)\}\}/g;

    function scan(node: unknown): void {
        if (typeof node === 'string') {
            let match;
            while ((match = pattern.exec(node)) !== null) {
                vars.add(match[1]);
            }
            // Reset regex state
            pattern.lastIndex = 0;
        } else if (Array.isArray(node)) {
            node.forEach(scan);
        } else if (typeof node === 'object' && node !== null) {
            Object.values(node).forEach(scan);
        }
    }

    scan(template);
    return Array.from(vars);
}

/**
 * Analyze an image iteratively, refining the template until it matches the original
 */
export async function analyzeIteratively(
    contentBuffer: Buffer,
    options: IterativeAnalyzeOptions = {}
): Promise<IterativeAnalyzeResponse> {
    const {
        width = 1080,
        height = 1080,
        mimeType = 'image/png',
        targetScore = DEFAULT_TARGET_SCORE,
        maxIterations = DEFAULT_MAX_ITERATIONS,
    } = options;

    const startTime = Date.now();
    const iterations: IterationLog[] = [];
    let currentTemplate: TemplateJSON | null = null;
    let finalScore: ComparisonScore = { layout: 0, colors: 0, typography: 0, spacing: 0, overall: 0 };
    let latestPreview: Buffer | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let analysis: any = null;

    logger.info('Starting iterative analysis', {
        width,
        height,
        targetScore,
        maxIterations,
        mimeType,
    });

    // Step 1: Initial Claude analysis
    try {
        const initialResult = await analyzeImage(contentBuffer, { width, height, mimeType });

        if (!initialResult.template) {
            throw new Error('Initial analysis did not return a template');
        }

        currentTemplate = initialResult.template;
        analysis = initialResult.analysis;

        logger.info('Initial template generated', {
            hasBackgroundImage: analysis?.hasBackgroundImage,
            elements: analysis?.detectedElements?.length,
        });
    } catch (error) {
        logger.error('Initial analysis failed', error);
        throw new Error(`Initial analysis failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Step 2: Iterative refinement loop
    for (let attempt = 1; attempt <= maxIterations; attempt++) {
        const iterationLog: IterationLog = {
            attempt,
            timestamp: new Date().toISOString(),
            renderSuccess: false,
        };

        logger.info(`Iteration ${attempt}/${maxIterations}`);

        // 2a. Sanitize template
        const { template: sanitizedTemplate, warnings } = sanitizeTemplate(currentTemplate!);
        currentTemplate = sanitizedTemplate;
        iterationLog.sanitizationWarnings = warnings;

        if (warnings.length > 0) {
            logger.warn('Sanitization applied', { warningCount: warnings.length });
        }

        // 2b. Attempt render
        try {
            const renderResult = await renderTemplate(currentTemplate, { width, height, format: 'png' });
            latestPreview = renderResult.buffer;
            iterationLog.renderSuccess = true;

            logger.info('Render successful', { size: latestPreview.length });
        } catch (renderError) {
            iterationLog.renderSuccess = false;
            iterationLog.renderError = renderError instanceof Error ? renderError.message : 'Unknown render error';

            logger.warn('Render failed', { error: iterationLog.renderError });

            // Request fix for render error
            if (attempt < maxIterations) {
                try {
                    logger.info('Requesting fix for render error...');
                    currentTemplate = await requestTemplateFix(
                        contentBuffer,
                        Buffer.alloc(0), // No rendered image available
                        currentTemplate,
                        [`Render error: ${iterationLog.renderError}`],
                        ['Fix CSS properties causing Satori render failure. Ensure only flexbox layout, no grid, no unsupported properties.'],
                        mimeType
                    );
                    iterationLog.suggestedFixes = ['Requested template fix for render error'];
                } catch (fixError) {
                    logger.error('Fix request failed', fixError);
                }
            }

            iterations.push(iterationLog);
            continue;
        }

        // 2c. Vision comparison
        try {
            const comparison = await compareImages(contentBuffer, latestPreview, mimeType);

            iterationLog.score = comparison.scores;
            iterationLog.issues = comparison.issues;
            iterationLog.suggestedFixes = comparison.suggestedFixes;
            finalScore = comparison.scores;

            logger.info('Comparison complete', {
                overall: comparison.scores.overall,
                issueCount: comparison.issues.length,
            });

            // Check if target reached
            if (comparison.scores.overall >= targetScore) {
                logger.info('Target score reached!', { score: comparison.scores.overall });
                iterations.push(iterationLog);
                break;
            }

            // 2d. Request improvement if not at target and more iterations available
            if (attempt < maxIterations) {
                logger.info('Requesting template improvement...');
                currentTemplate = await requestTemplateFix(
                    contentBuffer,
                    latestPreview,
                    currentTemplate,
                    comparison.issues,
                    comparison.suggestedFixes,
                    mimeType
                );

                logger.info('Template updated for next iteration');
            }
        } catch (comparisonError) {
            logger.error('Comparison failed', comparisonError);
            // Continue without comparison score - render was successful
            iterationLog.issues = ['Vision comparison failed - continuing with current template'];
        }

        iterations.push(iterationLog);
    }

    // Extract variables from final template
    const variables = extractVariables(currentTemplate!);

    // Prepare response
    const previewBase64 = latestPreview
        ? `data:image/png;base64,${latestPreview.toString('base64')}`
        : '';

    const processingTimeMs = Date.now() - startTime;

    logger.info('Iterative analysis complete', {
        totalIterations: iterations.length,
        finalScore: finalScore.overall,
        targetReached: finalScore.overall >= targetScore,
        processingTimeMs,
    });

    return {
        success: true,
        template: currentTemplate!,
        iterations,
        finalScore,
        previewImage: previewBase64,
        variables,
        analysis: analysis || {
            detectedElements: [],
            colorPalette: [],
            fonts: [],
        },
        totalIterations: iterations.length,
        targetScoreReached: finalScore.overall >= targetScore,
        processingTimeMs,
    };
}
