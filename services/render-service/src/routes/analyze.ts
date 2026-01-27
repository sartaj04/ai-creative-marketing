import { Router, Request, Response } from 'express';
import multer from 'multer';
import {
    analyzeImage,
    analyzeText,
    compareImages,
    requestTemplateFix,
    isBedrockConfigured
} from '../services/bedrock.js';
import { renderTemplate, sanitizeTemplate } from '../services/satori-renderer.js';
import { logger } from '../utils/logger.js';
import type { TemplateJSON } from '../types/template.js';

const router = Router();

// Configure multer for image uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (_req, file, cb) => {
        // Accept images and PDFs
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only image and PDF files are allowed'));
        }
    },
});

interface IterationResult {
    attempt: number;
    renderSuccess: boolean;
    score?: number;
    issues?: string[];
    fix?: string;
    error?: string;
    timestamp: number;
}

/**
 * POST /analyze-iterative
 * Iteratively analyze and refine a template to match the input image
 */
router.post('/iterative', upload.single('image'), async (req: Request, res: Response) => {
    try {
        if (!isBedrockConfigured()) {
            res.status(503).json({
                success: false,
                error: 'Service not configured. Set AWS Bedrock credentials.',
            });
            return;
        }

        if (!req.file) {
            res.status(400).json({ error: 'No image file provided' });
            return;
        }

        const maxIterations = parseInt(req.body.maxIterations as string || '5', 10);
        const targetScore = parseInt(req.body.targetScore as string || '85', 10);
        const width = parseInt(req.body.width as string || '1080', 10);
        const height = parseInt(req.body.height as string || '1080', 10);

        logger.info('Starting iterative analysis', {
            filename: req.file.originalname,
            maxIterations,
            targetScore
        });

        const iterations: IterationResult[] = [];
        let currentTemplate: TemplateJSON | null = null;
        let lastRenderBuffer: Buffer | null = null;
        let finalScore = 0;
        let analysisResult: any = null;

        // Initial Analysis
        try {
            const result = await analyzeImage(req.file.buffer, { width, height, mimeType: req.file.mimetype });
            if (!result.success || !result.template) {
                throw new Error('Initial analysis failed to generate a template');
            }
            currentTemplate = result.template;
            analysisResult = result.analysis;
        } catch (err) {
            res.status(500).json({ success: false, error: 'Initial analysis failed', details: err instanceof Error ? err.message : String(err) });
            return;
        }

        // Iteration Loop
        for (let i = 1; i <= maxIterations; i++) {
            logger.info(`Iteration ${i}/${maxIterations}`);
            const iterationStart = Date.now();
            let renderSuccess = false;
            let score = 0;
            let issues: string[] = [];
            let errorMsg: string | undefined;

            try {
                // 1. Sanitize
                if (!currentTemplate) break;
                const { template: sanitized, warnings } = sanitizeTemplate(currentTemplate);
                currentTemplate = sanitized;
                if (warnings.length > 0) {
                    issues.push(...warnings.map(w => `Sanitizer warning: ${w}`));
                }

                // 2. Render
                const renderResult = await renderTemplate(currentTemplate, { width, height });
                lastRenderBuffer = renderResult.buffer;
                renderSuccess = true;

                // 3. Compare (if render succeeded)
                const comparison = await compareImages(
                    req.file.buffer,
                    lastRenderBuffer,
                    req.file.mimetype
                );

                score = comparison.scores.overall;
                issues = [...issues, ...comparison.issues];
                finalScore = score;

                logger.info(`Iteration ${i} score: ${score}`);

                iterations.push({
                    attempt: i,
                    renderSuccess: true,
                    score,
                    issues: comparison.issues,
                    timestamp: Date.now()
                });

                // Check target
                if (score >= targetScore) {
                    logger.info('Target score reached');
                    break;
                }

                // 4. Refine (if not last iteration)
                if (i < maxIterations) {
                    const fixedTemplate = await requestTemplateFix(
                        req.file.buffer,
                        lastRenderBuffer,
                        currentTemplate,
                        issues,
                        comparison.suggestedFixes,
                        req.file.mimetype
                    );
                    currentTemplate = fixedTemplate;
                    iterations[iterations.length - 1].fix = "Refined template based on feedback";
                }

            } catch (err) {
                logger.error(`Iteration ${i} failed`, err);
                errorMsg = err instanceof Error ? err.message : String(err);
                iterations.push({
                    attempt: i,
                    renderSuccess: false,
                    error: errorMsg,
                    timestamp: Date.now()
                });

                // Try to fix render error
                if (i < maxIterations && currentTemplate) {
                    try {
                        const fixedTemplate = await requestTemplateFix(
                            req.file.buffer,
                            Buffer.from([]), // No render result
                            currentTemplate,
                            [`Render Error: ${errorMsg}`, ...issues],
                            ["Fix the JSON structure or CSS properties causing the error"],
                            req.file.mimetype
                        );
                        currentTemplate = fixedTemplate;
                        iterations[iterations.length - 1].fix = "Attempted to fix render error";
                    } catch (fixErr) {
                        logger.error('Failed to fix render error', fixErr);
                        break; // Stop if we can't even get a fix
                    }
                } else {
                    break;
                }
            }
        }

        res.json({
            success: true,
            template: currentTemplate,
            analysis: analysisResult,
            iterations,
            finalScore,
            previewImage: lastRenderBuffer ? `data:image/png;base64,${lastRenderBuffer.toString('base64')}` : null
        });

    } catch (error) {
        logger.error('Iterative analyze error', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Iterative analysis failed',
        });
    }
});

/**
 * POST /analyze
 * Upload an image to analyze and generate template JSON
 */
router.post('/', upload.single('image'), async (req: Request, res: Response) => {
    try {
        // Check if Bedrock is configured
        if (!isBedrockConfigured()) {
            res.status(503).json({
                success: false,
                error: 'Image analysis service not configured. Set AWS Bedrock credentials.',
            });
            return;
        }

        // Validate file upload
        if (!req.file) {
            res.status(400).json({
                success: false,
                error: 'No image file provided. Send as multipart/form-data with field "image".',
            });
            return;
        }

        // Get optional dimensions from request body
        const width = parseInt(req.body.width as string, 10) || 1080;
        const height = parseInt(req.body.height as string, 10) || 1080;

        logger.info('Analyze request received', {
            filename: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            targetWidth: width,
            targetHeight: height,
        });

        // Analyze image with Claude
        const result = await analyzeImage(req.file.buffer, {
            width,
            height,
            mimeType: req.file.mimetype,
        });

        res.json(result);
    } catch (error) {
        logger.error('Analyze endpoint error', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Analysis failed',
        });
    }
});

/**
 * POST /analyze/text
 * Paste text to analyze and generate reusable format placeholders
 */
router.post('/text', async (req: Request, res: Response) => {
    try {
        if (!isBedrockConfigured()) {
            res.status(503).json({
                success: false,
                error: 'Text analysis service not configured. Set AWS Bedrock credentials.',
            });
            return;
        }

        const { text } = req.body;
        if (!text || typeof text !== 'string') {
            res.status(400).json({
                success: false,
                error: 'No text provided. Send JSON with "text" field.',
            });
            return;
        }

        logger.info('Text analyze request received', {
            length: text.length,
        });

        const result = await analyzeText(text);
        res.json(result);
    } catch (error) {
        logger.error('Text analyze endpoint error', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Analysis failed',
        });
    }
});


export default router;
