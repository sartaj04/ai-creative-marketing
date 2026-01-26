/**
 * Satori Renderer Service
 * Converts template JSON to PNG using Satori + Resvg
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';
import type { TemplateJSON, TemplateNode } from '../types/template.js';

// Font cache
let fontData: ArrayBuffer | null = null;

/**
 * Load default font (Inter)
 * In production, you should bundle fonts or load from a CDN
 */
async function loadFont(): Promise<ArrayBuffer> {
    if (fontData) {
        return fontData;
    }

    // Try to load Inter font from local fonts directory
    const fontPath = join(process.cwd(), 'fonts', 'Inter-Regular.ttf');

    if (existsSync(fontPath)) {
        logger.info('Loading font from local file', { path: fontPath });
        fontData = readFileSync(fontPath).buffer;
        return fontData;
    }

    // Fallback: fetch from Google Fonts CDN
    logger.info('Fetching font from Google Fonts CDN');
    try {
        const response = await fetch(
            'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff'
        );
        const buffer = await response.arrayBuffer();
        fontData = buffer;
        return fontData;
    } catch (error) {
        logger.error('Failed to load font', error);
        throw new Error('Failed to load font for rendering');
    }
}

/**
 * Convert template JSON to React-like element structure for Satori
 */
// Transparent 1x1 pixel for placeholder replacement
const TRANSPARENT_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function templateToElement(node: TemplateNode | string): any {
    // Handle text nodes
    if (typeof node === 'string') {
        return node;
    }

    // Build props
    const props: Record<string, unknown> = { ...node.props };

    // SANITIZATION: Fix Satori crash on invalid URLs (placeholders)
    if (node.type === 'img' && typeof props.src === 'string') {
        if (props.src.trim() === '' || props.src.includes('{{') || !props.src.startsWith('http') && !props.src.startsWith('data:')) {
            props.src = TRANSPARENT_PIXEL;
        }
    }

    // Check backgroundImage in style for placeholders too
    if (props.style && typeof (props.style as any).backgroundImage === 'string') {
        const bgImg = (props.style as any).backgroundImage as string;
        if (bgImg.includes('{{') && !bgImg.includes('url(')) {
            // If it's just raw '{{background}}' it's invalid css anyway, but satori might choke on url('{{...}}')
            // Satori is lenient with background-image: url() even if broken, but let's be safe.
            // Usually Satori only crashes on <img> src.
        }
    }

    // Handle children recursively
    let children: unknown = null;
    if (node.children && node.children.length > 0) {
        children = node.children.map((child, index) => {
            const element = templateToElement(child);
            // Wrap in object with key for arrays
            if (typeof element === 'object' && element !== null) {
                return { ...(element as object), key: index };
            }
            return element;
        });
    }

    // Return element descriptor for Satori
    return {
        type: node.type,
        props: {
            ...props,
            children,
        },
    };
}

export interface RenderOptions {
    width: number;
    height: number;
    format?: 'png' | 'svg';
}

export interface RenderResult {
    buffer: Buffer;
    format: string;
    width: number;
    height: number;
}

/**
 * Render template JSON to image buffer
 */
export async function renderTemplate(
    template: TemplateJSON,
    options: RenderOptions
): Promise<RenderResult> {
    const { width, height, format = 'png' } = options;

    logger.info('Rendering template', { width, height, format });

    try {
        // Load font
        const font = await loadFont();

        // Convert template to React element
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const element = templateToElement(template) as any;

        // Render to SVG using Satori
        const svg = await satori(element, {
            width,
            height,
            fonts: [
                {
                    name: 'Inter',
                    data: font,
                    weight: 400,
                    style: 'normal',
                },
            ],
        });

        // If SVG format requested, return SVG string
        if (format === 'svg') {
            return {
                buffer: Buffer.from(svg, 'utf-8'),
                format: 'svg',
                width,
                height,
            };
        }

        // Convert SVG to PNG using Resvg
        const resvg = new Resvg(svg, {
            fitTo: {
                mode: 'width',
                value: width,
            },
        });

        const pngData = resvg.render();
        const pngBuffer = pngData.asPng();

        logger.info('Render complete', {
            format: 'png',
            size: pngBuffer.length,
            width: pngData.width,
            height: pngData.height,
        });

        return {
            buffer: Buffer.from(pngBuffer),
            format: 'png',
            width: pngData.width,
            height: pngData.height,
        };
    } catch (error) {
        logger.error('Render failed', error);
        throw new Error(`Render failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Create a simple test template for verification
 */
export function createTestTemplate(
    text: string = 'Hello, Pixo!',
    backgroundColor: string = '#1a1a2e'
): TemplateJSON {
    return {
        type: 'div',
        props: {
            style: {
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                height: '100%',
                backgroundColor,
                padding: 40,
            },
        },
        children: [
            {
                type: 'h1',
                props: {
                    style: {
                        fontSize: 64,
                        fontWeight: 'bold',
                        color: '#ffffff',
                        textAlign: 'center',
                    },
                },
                children: [text],
            },
        ],
    };
}
