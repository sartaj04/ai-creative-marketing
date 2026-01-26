/**
 * Analyze Route
 * POST /analyze - Upload image, Claude generates Satori template JSON
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { analyzeImage, analyzeText, isBedrockConfigured } from '../services/bedrock.js';
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
