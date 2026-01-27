/**
 * Render Service API Client
 * Client for the Node.js render service
 */

const RENDER_SERVICE_URL = process.env.NEXT_PUBLIC_RENDER_SERVICE_URL || 'http://localhost:3001';

// Types
export interface TemplateNode {
    type: string;
    props?: {
        style?: Record<string, unknown>;
        src?: string;
        [key: string]: unknown;
    };
    children?: (TemplateNode | string)[];
}

export interface TemplateJSON {
    type: 'div';
    props: {
        style: Record<string, unknown>;
        [key: string]: unknown;
    };
    children?: (TemplateNode | string)[];
}

export interface AnalyzeResponse {
    success: boolean;
    template?: TemplateJSON; // For single post
    slides?: {               // For carousel
        page: number;
        template: TemplateJSON;
        analysis: {
            detectedElements: string[];
            colorPalette: string[];
            fonts: string[];
        };
    }[];
    analysis?: {             // For single post
        detectedElements: string[];
        colorPalette: string[];
        fonts: string[];
        hasBackgroundImage?: boolean;
    };
    commonAnalysis?: {       // For carousel
        colorPalette: string[];
        fonts: string[];
    };
}

export interface RenderResponse {
    success: boolean;
    url: string;
    format: string;
    width: number;
    height: number;
}

export interface PreviewResponse {
    success: boolean;
    data: string; // base64 data URL
    format: string;
    width: number;
    height: number;
}

export interface UnsplashImage {
    id: string;
    urls: {
        raw: string;
        full: string;
        regular: string;
        small: string;
        thumb: string;
    };
    width: number;
    height: number;
    color: string;
    blur_hash: string;
    user: {
        name: string;
        username: string;
    };
}

export interface UnsplashSearchResponse {
    success: boolean;
    results: UnsplashImage[];
    total: number;
    totalPages: number;
}

export interface TextAnalyzeResponse {
    success: boolean;
    format: string;
    name: string;
    description: string;
    variables: {
        name: string;
        type: 'text';
    }[];
    platform?: 'linkedin' | 'twitter' | 'instagram' | 'general';
    postType?: 'thread' | 'carousel' | 'standard' | 'reel';
}

/**
 * Score breakdown for vision comparison
 */
export interface ComparisonScore {
    layout: number;      // 0-100
    colors: number;      // 0-100
    typography: number;  // 0-100
    spacing: number;     // 0-100
    overall: number;     // 0-100 weighted average
}

/**
 * Single iteration log entry
 */
export interface IterationLog {
    attempt: number;
    timestamp: string;
    renderSuccess: boolean;
    renderError?: string;
    sanitizationWarnings?: string[];
    score?: ComparisonScore;
    issues?: string[];
    suggestedFixes?: string[];
}

/**
 * Iterative analysis response
 */
export interface IterativeAnalyzeResponse {
    success: boolean;
    template: TemplateJSON;
    iterations: IterationLog[];
    finalScore: ComparisonScore;
    previewImage: string;          // base64 data URL
    variables: string[];           // Extracted placeholder names
    analysis: {
        detectedElements: string[];
        colorPalette: string[];
        fonts: string[];
        hasBackgroundImage?: boolean;
        searchQuery?: string;
    };
    totalIterations: number;
    targetScoreReached: boolean;
    processingTimeMs: number;
}

/**
 * Analyze an image to generate a template JSON
 */
export async function analyzeImage(
    file: File,
    width: number = 1080,
    height: number = 1080
): Promise<AnalyzeResponse> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('width', width.toString());
    formData.append('height', height.toString());

    const response = await fetch(`${RENDER_SERVICE_URL}/analyze`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
    }

    return response.json();
}

/**
 * Iteratively analyze an image with self-healing template generation
 */
export async function analyzeImageIterative(
    file: File,
    width: number = 1080,
    height: number = 1080,
    targetScore: number = 85,
    maxIterations: number = 5
): Promise<IterativeAnalyzeResponse> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('width', width.toString());
    formData.append('height', height.toString());
    formData.append('targetScore', targetScore.toString());
    formData.append('maxIterations', maxIterations.toString());

    const response = await fetch(`${RENDER_SERVICE_URL}/analyze-iterative`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Iterative analysis failed');
    }

    return response.json();
}



/**
 * Analyze text to extract reusable format placeholders
 */
export async function analyzeText(text: string): Promise<TextAnalyzeResponse> {
    const response = await fetch(`${RENDER_SERVICE_URL}/analyze/text`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Text analysis failed');
    }

    return response.json();
}

/**
 * Render template to PNG and upload to S3
 */
export async function renderTemplate(
    template: TemplateJSON,
    width: number,
    height: number,
    uploadPath?: string
): Promise<RenderResponse> {
    const response = await fetch(`${RENDER_SERVICE_URL}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            template,
            width,
            height,
            uploadPath,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Render failed');
    }

    return response.json();
}

/**
 * Render template to base64 preview (no S3 upload)
 */
export async function renderPreview(
    template: TemplateJSON,
    width: number,
    height: number
): Promise<PreviewResponse> {
    const response = await fetch(`${RENDER_SERVICE_URL}/render/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            template,
            width,
            height,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Preview failed');
    }

    return response.json();
}

/**
 * Search Unsplash for background images
 */
export async function searchUnsplash(
    query: string,
    options: {
        page?: number;
        perPage?: number;
        orientation?: 'landscape' | 'portrait' | 'squarish';
    } = {}
): Promise<UnsplashSearchResponse> {
    const params = new URLSearchParams({
        query,
        page: (options.page || 1).toString(),
        perPage: (options.perPage || 12).toString(),
    });

    if (options.orientation) {
        params.append('orientation', options.orientation);
    }

    const response = await fetch(
        `${RENDER_SERVICE_URL}/unsplash/search?${params}`,
        { method: 'GET' }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Search failed');
    }

    return response.json();
}

/**
 * Get a random image from Unsplash
 */
export async function getRandomUnsplashImage(query: string = 'nature'): Promise<UnsplashImage | null> {
    try {
        const response = await fetch(
            `${RENDER_SERVICE_URL}/unsplash/random?query=${encodeURIComponent(query)}`,
            { method: 'GET' }
        );

        if (!response.ok) return null;

        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error('Failed to fetch random Unsplash image:', error);
        return null;
    }
}


/**
 * Check render service health
 */
export async function checkHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${RENDER_SERVICE_URL}/health`);
        return response.ok;
    } catch {
        return false;
    }
}

// Convenience export
export const renderServiceApi = {
    analyzeImage,
    analyzeText,
    renderTemplate,
    renderPreview,
    searchUnsplash,
    getRandomUnsplashImage,
    checkHealth,
};

export default renderServiceApi;
