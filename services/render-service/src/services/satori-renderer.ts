/**
 * Satori Renderer Service
 * Converts template JSON to PNG using Satori + Resvg
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';
import type { TemplateJSON, TemplateNode, TemplateSanitizationResult } from '../types/template.js';

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

// CSS properties that Satori does NOT support
const UNSUPPORTED_PROPERTIES = new Set([
    'filter',
    'backdropFilter',
    'backdrop-filter',
    'animation',
    'animationName',
    'animationDuration',
    'transition',
    'transitionProperty',
    'transitionDuration',
    'cursor',
    'pointerEvents',
    'userSelect',
    'resize',
    'outline',
    'outlineWidth',
    'outlineColor',
    'outlineStyle',
    'content',
    'listStyle',
    'listStyleType',
    'visibility',
    'clipPath',
    'clip-path',
    'mask',
    'maskImage',
]);

/**
 * Sanitize a single style object for Satori compatibility
 */
function sanitizeStyle(style: Record<string, unknown>): { sanitized: Record<string, unknown>; warnings: string[] } {
    const warnings: string[] = [];
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(style)) {
        // Skip unsupported properties
        if (UNSUPPORTED_PROPERTIES.has(key)) {
            warnings.push(`Removed unsupported property: ${key}`);
            continue;
        }

        // Handle string values
        if (typeof value === 'string') {
            let processedValue: string | null = value;

            // Convert 'transparent' to rgba
            if (value === 'transparent') {
                processedValue = 'rgba(0,0,0,0)';
                warnings.push(`Converted 'transparent' to 'rgba(0,0,0,0)' in ${key}`);
            }
            // Fix common LLM typo: gba -> rgba
            else if (value.includes('gba(')) {
                processedValue = value.replace(/gba\(/g, 'rgba(');
                warnings.push(`Fixed typo: converted 'gba(' to 'rgba(' in ${key}`);
            }
            // Fix common LLM typo: gb -> rgb
            else if (value.includes('gb(') && !value.includes('rgb(')) {
                processedValue = value.replace(/gb\(/g, 'rgb(');
                warnings.push(`Fixed typo: converted 'gb(' to 'rgb(' in ${key}`);
            }
            // Handle repeating-linear-gradient
            else if (value.includes('repeating-linear-gradient')) {
                processedValue = value.replace(/repeating-linear-gradient/g, 'linear-gradient');
                warnings.push(`Converted repeating-linear-gradient to linear-gradient in ${key}`);
            }
            // Handle repeating-radial-gradient - extract first color as fallback
            else if (value.includes('repeating-radial-gradient') || value.includes('radial-gradient')) {
                const colorMatch = value.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)/);
                if (colorMatch) {
                    processedValue = colorMatch[0];
                    warnings.push(`Converted radial-gradient to solid color ${processedValue} in ${key}`);
                } else {
                    processedValue = null;
                    warnings.push(`Removed unsupported radial-gradient in ${key}`);
                }
            }
            // Handle calc() - Satori doesn't support it
            else if (value.includes('calc(')) {
                processedValue = null;
                warnings.push(`Removed unsupported calc() in ${key}`);
            }
            // Handle fit-content, min-content, max-content
            else if (['fit-content', 'min-content', 'max-content'].includes(value)) {
                processedValue = null;
                warnings.push(`Removed unsupported value '${value}' in ${key}`);
            }
            // Handle currentColor
            else if (value === 'currentColor' && key !== 'color') {
                processedValue = '#000000';
                warnings.push(`Converted 'currentColor' to '#000000' in ${key}`);
            }
            // Handle 3D transforms
            else if (key === 'transform' && (value.includes('3d') || value.includes('perspective'))) {
                // Try to extract 2D transform or remove
                const has2D = value.match(/(translate|rotate|scale|skew)\([^)]+\)/g);
                if (has2D && has2D.length > 0) {
                    processedValue = has2D.join(' ');
                    warnings.push(`Removed 3D transforms, kept 2D: ${processedValue}`);
                } else {
                    processedValue = null;
                    warnings.push(`Removed unsupported 3D transform in ${key}`);
                }
            }

            if (processedValue !== null) {
                sanitized[key] = processedValue;
            }
        }
        // Handle display: grid conversion
        else if (key === 'display' && value === 'grid') {
            sanitized['display'] = 'flex';
            sanitized['flexWrap'] = 'wrap';
            warnings.push(`Converted display: grid to display: flex with flexWrap: wrap`);
        }
        // Handle display: inline-block, inline-flex
        else if (key === 'display' && (value === 'inline-block' || value === 'inline-flex' || value === 'inline')) {
            sanitized['display'] = 'flex';
            warnings.push(`Converted display: ${value} to display: flex`);
        }
        // Remove grid-specific properties
        else if (key.startsWith('grid') || key === 'gridGap' || key === 'grid-gap') {
            if (key === 'gridGap' || key === 'grid-gap') {
                sanitized['gap'] = value;
                warnings.push(`Converted ${key} to gap`);
            } else {
                warnings.push(`Removed unsupported grid property: ${key}`);
            }
        }
        // Pass through other values
        else {
            sanitized[key] = value;
        }
    }

    return { sanitized, warnings };
}

/**
 * Recursively sanitize a template node
 */
function sanitizeNode(node: TemplateNode): { node: TemplateNode; warnings: string[] } {
    const allWarnings: string[] = [];
    const sanitizedNode: TemplateNode = { ...node };

    // Sanitize style if present
    if (node.props?.style) {
        const { sanitized, warnings } = sanitizeStyle(node.props.style as Record<string, unknown>);
        sanitizedNode.props = { ...node.props, style: sanitized };
        allWarnings.push(...warnings);
    }

    // Recursively sanitize children
    if (node.children && node.children.length > 0) {
        sanitizedNode.children = node.children.map(child => {
            if (typeof child === 'string') {
                return child;
            }
            const { node: sanitizedChild, warnings } = sanitizeNode(child);
            allWarnings.push(...warnings);
            return sanitizedChild;
        });
    }

    return { node: sanitizedNode, warnings: allWarnings };
}

/**
 * Sanitize a template for Satori compatibility
 * Transforms unsupported CSS to supported alternatives
 */
export function sanitizeTemplate(template: TemplateJSON): TemplateSanitizationResult {
    const { node, warnings } = sanitizeNode(template);

    if (warnings.length > 0) {
        logger.warn('Template sanitized', { warningCount: warnings.length, warnings: warnings.slice(0, 10) });
    }

    return {
        template: node as TemplateJSON,
        warnings,
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function templateToElement(node: TemplateNode | string): any {
    // Handle text nodes
    if (typeof node === 'string') {
        return node;
    }

    // Build props
    const props: Record<string, unknown> = { ...node.props };

    // Ensure style object exists
    if (!props.style) {
        props.style = {};
    }
    const style = props.style as any;

    // SANITIZATION: Fix Satori crash on invalid URLs (placeholders)
    if (node.type === 'img' && typeof props.src === 'string') {
        if (props.src.trim() === '' || props.src.includes('{{') || !props.src.startsWith('http') && !props.src.startsWith('data:')) {
            props.src = TRANSPARENT_PIXEL;
        }
    }

    // SANITIZATION: Satori requires explicit display: flex for containers with multiple children
    if (node.children && node.children.length > 0) {
        if (!style.display) {
            style.display = 'flex';
            // Default to column to mimic block behavior
            if (!style.flexDirection) {
                style.flexDirection = 'column';
            }
        }
    }

    // SANITIZATION: Yoga/Satori crash on 'fit-content'
    if (style.width === 'fit-content') delete style.width;
    if (style.height === 'fit-content') delete style.height;

    // SANITIZATION: Invalid background-image url() syntax or placeholders
    if (typeof style.backgroundImage === 'string') {
        const bgImg = style.backgroundImage;
        if (bgImg.includes('{{')) {
            delete style.backgroundImage;
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
