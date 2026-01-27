/**
 * Iterative Analyze Route
 * POST /analyze-iterative - Agentic template generation with self-healing
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { analyzeIteratively } from '../services/iterative-analyzer.js';
import { isBedrockConfigured } from '../services/bedrock.js';
import { logger } from '../utils/logger.js';

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

/**
 * POST /analyze-iterative
 * Iteratively analyze and refine template until target score reached
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

        // Parse options from request body
        const width = parseInt(req.body.width as string, 10) || 1080;
        const height = parseInt(req.body.height as string, 10) || 1080;
        const targetScore = parseInt(req.body.targetScore as string, 10) || 85;
        const maxIterations = parseInt(req.body.maxIterations as string, 10) || 5;

        // Validate ranges
        const validatedTargetScore = Math.min(100, Math.max(50, targetScore));
        const validatedMaxIterations = Math.min(10, Math.max(1, maxIterations));

        logger.info('Iterative analyze request received', {
            filename: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            targetWidth: width,
            targetHeight: height,
            targetScore: validatedTargetScore,
            maxIterations: validatedMaxIterations,
        });

        // Run iterative analysis
        const result = await analyzeIteratively(req.file.buffer, {
            width,
            height,
            mimeType: req.file.mimetype,
            targetScore: validatedTargetScore,
            maxIterations: validatedMaxIterations,
        });

        logger.info('Iterative analyze complete', {
            iterations: result.totalIterations,
            finalScore: result.finalScore.overall,
            targetReached: result.targetScoreReached,
            processingTimeMs: result.processingTimeMs,
        });

        res.json(result);
    } catch (error) {
        logger.error('Iterative analyze endpoint error', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Analysis failed',
        });
    }
});

export default router;
