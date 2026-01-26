/**
 * Render Route
 * POST /render - Render Satori template to PNG, upload to S3
 */
import { Router, Request, Response } from 'express';
import { renderTemplate, createTestTemplate } from '../services/satori-renderer.js';
import { uploadToS3 } from '../services/s3.js';
import { logger } from '../utils/logger.js';
import type { RenderRequest, TemplateJSON } from '../types/template.js';

const router = Router();

/**
 * POST /render
 * Render template JSON to PNG and upload to S3
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const body = req.body as RenderRequest;

        // Validate request
        if (!body.template) {
            res.status(400).json({
                success: false,
                error: 'Missing template in request body',
            });
            return;
        }

        if (!body.width || !body.height) {
            res.status(400).json({
                success: false,
                error: 'Missing width or height in request body',
            });
            return;
        }

        // Validate template structure
        if (typeof body.template !== 'object' || !body.template.type) {
            res.status(400).json({
                success: false,
                error: 'Invalid template structure. Must have "type" property.',
            });
            return;
        }

        logger.info('Render request received', {
            width: body.width,
            height: body.height,
            format: body.format || 'png',
        });

        // Render template
        const result = await renderTemplate(body.template, {
            width: body.width,
            height: body.height,
            format: body.format || 'png',
        });

        // Upload to S3
        const contentType = result.format === 'svg' ? 'image/svg+xml' : 'image/png';
        const prefix = body.uploadPath || 'renders';

        const upload = await uploadToS3(result.buffer, {
            contentType,
            prefix,
        });

        res.json({
            success: true,
            url: upload.url,
            format: result.format,
            width: result.width,
            height: result.height,
        });
    } catch (error) {
        logger.error('Render endpoint error', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Render failed',
        });
    }
});

/**
 * POST /render/preview
 * Render template and return base64 image (no S3 upload)
 * Useful for quick previews
 */
router.post('/preview', async (req: Request, res: Response) => {
    try {
        const body = req.body as RenderRequest;

        // Validate request
        if (!body.template || !body.width || !body.height) {
            res.status(400).json({
                success: false,
                error: 'Missing template, width, or height in request body',
            });
            return;
        }

        // Render template
        const result = await renderTemplate(body.template, {
            width: body.width,
            height: body.height,
            format: body.format || 'png',
        });

        // Return base64 encoded image
        const base64 = result.buffer.toString('base64');
        const mimeType = result.format === 'svg' ? 'image/svg+xml' : 'image/png';

        res.json({
            success: true,
            data: `data:${mimeType};base64,${base64}`,
            format: result.format,
            width: result.width,
            height: result.height,
        });
    } catch (error) {
        logger.error('Preview endpoint error', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Preview failed',
        });
    }
});

/**
 * GET /render/test
 * Render a test template to verify the service is working
 */
router.get('/test', async (req: Request, res: Response) => {
    try {
        const text = (req.query.text as string) || 'Hello, Pixo!';
        const width = parseInt(req.query.width as string, 10) || 600;
        const height = parseInt(req.query.height as string, 10) || 400;

        // Create test template
        const template: TemplateJSON = createTestTemplate(text);

        // Render
        const result = await renderTemplate(template, { width, height });

        // Return as image
        res.set('Content-Type', 'image/png');
        res.send(result.buffer);
    } catch (error) {
        logger.error('Test render error', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Test render failed',
        });
    }
});

export default router;
