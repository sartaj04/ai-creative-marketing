/**
 * Unsplash Route
 * GET /unsplash/search - Search for background images
 */
import { Router, Request, Response } from 'express';
import { searchImages, getRandomImage, isUnsplashConfigured } from '../services/unsplash.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /unsplash/search
 * Search for background images
 */
router.get('/search', async (req: Request, res: Response) => {
    try {
        // Check if Unsplash is configured
        if (!isUnsplashConfigured()) {
            res.status(503).json({
                success: false,
                error: 'Unsplash API not configured. Set UNSPLASH_ACCESS_KEY.',
            });
            return;
        }

        // Get query parameters
        const query = req.query.query as string;

        if (!query) {
            res.status(400).json({
                success: false,
                error: 'Missing required query parameter: query',
            });
            return;
        }

        const page = parseInt(req.query.page as string, 10) || 1;
        const perPage = Math.min(parseInt(req.query.perPage as string, 10) || 10, 30);
        const orientation = req.query.orientation as 'landscape' | 'portrait' | 'squarish' | undefined;
        const color = req.query.color as string | undefined;

        logger.info('Unsplash search request', { query, page, perPage, orientation });

        // Search Unsplash
        const result = await searchImages({
            query,
            page,
            perPage,
            orientation,
            color,
        });

        res.json(result);
    } catch (error) {
        logger.error('Unsplash search error', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Search failed',
        });
    }
});

/**
 * GET /unsplash/random
 * Get a random image
 */
router.get('/random', async (req: Request, res: Response) => {
    try {
        if (!isUnsplashConfigured()) {
            res.status(503).json({
                success: false,
                error: 'Unsplash API not configured. Set UNSPLASH_ACCESS_KEY.',
            });
            return;
        }

        const query = req.query.query as string || 'nature';
        const result = await getRandomImage(query);

        if (!result) {
            res.status(404).json({
                success: false,
                error: 'No image found',
            });
            return;
        }

        res.json({
            success: true,
            result,
        });
    } catch (error) {
        logger.error('Unsplash random error', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch random image',
        });
    }
});


export default router;
