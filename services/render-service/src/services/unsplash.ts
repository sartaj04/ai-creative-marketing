/**
 * Unsplash API Service
 * Search for background images
 */
import { createApi } from 'unsplash-js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { UnsplashImage, UnsplashSearchResponse } from '../types/template.js';

// Initialize Unsplash client
const unsplash = createApi({
    accessKey: env.unsplash.accessKey,
    fetch: fetch,
});

export interface SearchOptions {
    query: string;
    page?: number;
    perPage?: number;
    orientation?: 'landscape' | 'portrait' | 'squarish';
    color?: string;
}

/**
 * Search for images on Unsplash
 */
export async function searchImages(options: SearchOptions): Promise<UnsplashSearchResponse> {
    const {
        query,
        page = 1,
        perPage = 10,
        orientation,
        color,
    } = options;

    logger.info('Searching Unsplash', { query, page, perPage, orientation });

    if (!env.unsplash.accessKey) {
        throw new Error('Unsplash API key not configured');
    }

    try {
        const result = await unsplash.search.getPhotos({
            query,
            page,
            perPage,
            orientation,
            color: color as 'black_and_white' | 'black' | 'white' | 'yellow' | 'orange' | 'red' | 'purple' | 'magenta' | 'green' | 'teal' | 'blue' | undefined,
        });

        if (result.errors) {
            throw new Error(result.errors.join(', '));
        }

        const response = result.response;

        if (!response) {
            return {
                success: true,
                results: [],
                total: 0,
                totalPages: 0,
            };
        }

        // Map to our format
        const images: UnsplashImage[] = response.results.map((photo) => ({
            id: photo.id,
            urls: {
                raw: photo.urls.raw,
                full: photo.urls.full,
                regular: photo.urls.regular,
                small: photo.urls.small,
                thumb: photo.urls.thumb,
            },
            width: photo.width,
            height: photo.height,
            color: photo.color || '#000000',
            blur_hash: photo.blur_hash || '',
            user: {
                name: photo.user.name || '',
                username: photo.user.username,
            },
        }));

        logger.info('Unsplash search complete', {
            total: response.total,
            returned: images.length,
        });

        return {
            success: true,
            results: images,
            total: response.total,
            totalPages: response.total_pages,
        };
    } catch (error) {
        logger.error('Unsplash search failed', error);
        throw new Error(`Unsplash search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Get a random image from Unsplash
 */
export async function getRandomImage(query: string = 'nature'): Promise<UnsplashImage | null> {
    logger.info('Fetching random Unsplash image', { query });

    if (!env.unsplash.accessKey) {
        return null;
    }

    try {
        const result = await unsplash.photos.getRandom({
            query,
            count: 1,
        });

        if (result.errors) {
            throw new Error(result.errors.join(', '));
        }

        const response = result.response;
        if (!response || !Array.isArray(response) || response.length === 0) {
            return null;
        }

        const photo = response[0];
        return {
            id: photo.id,
            urls: {
                raw: photo.urls.raw,
                full: photo.urls.full,
                regular: photo.urls.regular,
                small: photo.urls.small,
                thumb: photo.urls.thumb,
            },
            width: photo.width,
            height: photo.height,
            color: photo.color || '#000000',
            blur_hash: photo.blur_hash || '',
            user: {
                name: photo.user.name || '',
                username: photo.user.username,
            },
        };
    } catch (error) {
        logger.error('Unsplash random image failed', error);
        return null;
    }
}

/**
 * Check if Unsplash is configured
 */
export function isUnsplashConfigured(): boolean {
    return !!env.unsplash.accessKey;
}
