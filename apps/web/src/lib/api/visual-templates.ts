import { apiClient } from './client';

// ── Slide types ───────────────────────────────────────────────────────

export interface VariableFieldSchema {
    type: 'text' | 'textarea' | 'image' | 'color' | 'font' | 'number' | 'select' | 'array';
    label?: string;           // Human-readable display name e.g. "Heading Font Size"
    section?: string;         // "Typography" | "Colors" | "Content" | "Layout" | "Images"
    description: string;
    required: boolean;
    maxLength: number | null;
    // Number-specific
    min?: number | null;
    max?: number | null;
    step?: number | null;
    unit?: string | null;     // "px", "%", "em", "ratio"
    // Select-specific
    options?: string[] | null;
    // General
    placeholder?: string | null;
    // Array-specific
    itemSchema?: {
        type: 'text' | 'textarea' | 'image';
    };
}

export interface SlideTemplateCreate {
    html_structure: string;
    variable_schema: Record<string, VariableFieldSchema>;
    default_values: Record<string, string>;
}

export interface SlideTemplate extends SlideTemplateCreate {
    id: string;
    visual_template_id: string;
    order: number;
    created_at: string;
}

// ── Visual Template types ─────────────────────────────────────────────

export interface VisualTemplate {
    id: string;
    name: string;
    type: 'image' | 'carousel';
    category: string;
    preview_url: string | null;
    html_template: string | null;
    canvas_json: Record<string, unknown> | null;
    variables_schema: Record<string, VariableFieldSchema>;
    slide_count: number | null;
    slides_schema: Record<string, unknown> | null; // legacy field
    slides: SlideTemplate[]; // per-slide HTML definitions
    default_values: Record<string, string>;
    tags: string[];
    platform: 'linkedin' | 'twitter' | 'both';
    dimensions: { width: number; height: number };
    is_system: boolean;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface VisualTemplateListResponse {
    templates: VisualTemplate[];
    total: number;
}

export interface VisualTemplateCreateRequest {
    name: string;
    type: 'image' | 'carousel';
    category: string;
    html_template?: string | null;
    canvas_json?: Record<string, unknown> | null;
    variables_schema?: Record<string, VariableFieldSchema>;
    slide_count?: number | null;
    slides_schema?: Record<string, unknown> | null; // legacy
    slides?: SlideTemplateCreate[]; // per-slide for carousel templates
    default_values?: Record<string, string>;
    tags?: string[];
    platform?: 'linkedin' | 'twitter' | 'both';
    dimensions?: { width: number; height: number };
}

export interface VisualTemplateDraft {
    name: string;
    type: 'image' | 'carousel';
    category: string;
    html_template: string;
    variables_schema: Record<string, VariableFieldSchema>;
    slide_count?: number | null;
    default_values: Record<string, string>;
    tags: string[];
    dimensions: { width: number; height: number };
    slides: SlideTemplateCreate[]; // pipeline-generated per-slide HTML
}

// ── API client ────────────────────────────────────────────────────────

export const visualTemplatesApi = {
    /**
     * List visual templates (system + user's custom)
     */
    list: async (params?: {
        type?: 'image' | 'carousel';
        category?: string;
        platform?: string;
        tags?: string;
        search?: string;
        limit?: number;
        offset?: number;
    }): Promise<VisualTemplateListResponse> => {
        const response = await apiClient.get('/visual-templates', { params });
        return response.data as VisualTemplateListResponse;
    },

    /**
     * Get a specific template with full schema and slides
     */
    get: async (id: string): Promise<VisualTemplate> => {
        const response = await apiClient.get(`/visual-templates/${id}`);
        return response.data as VisualTemplate;
    },

    /**
     * Create a custom template.
     * For carousel templates, include a `slides` array with per-slide HTML.
     */
    create: async (data: VisualTemplateCreateRequest): Promise<VisualTemplate> => {
        const response = await apiClient.post('/visual-templates', data);
        return response.data as VisualTemplate;
    },

    /**
     * Update a custom template
     */
    update: async (id: string, data: Partial<VisualTemplateCreateRequest>): Promise<VisualTemplate> => {
        const response = await apiClient.put(`/visual-templates/${id}`, data);
        return response.data as VisualTemplate;
    },

    /**
     * Preview a template render with variables
     */
    preview: async (id: string, data: {
        variables: Record<string, string>;
        brand_overrides?: Record<string, string> | null;
    }): Promise<{ preview_url: string; preview_urls?: string[]; pdf_url?: string; download_url?: string; pdf_download_url?: string; zip_download_url?: string; storage_key: string }> => {
        const response = await apiClient.post(`/visual-templates/${id}/preview`, data);
        return response.data;
    },

    /**
     * Generate a template from an uploaded image/PDF via multi-agent pipeline.
     * Returns a VisualTemplateDraft including per-slide HTML for carousel type.
     */
    generate: async (
        file: File,
        templateType: 'image' | 'carousel' = 'image',
        aspectRatio: '1:1' | '16:9' | '9:16' = '1:1'
    ): Promise<VisualTemplateDraft> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post(
            `/visual-templates/generate?template_type=${templateType}&aspect_ratio=${aspectRatio}`,
            formData,
            {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 300000, // 5 min timeout for pipeline
            },
        );
        return response.data as VisualTemplateDraft;
    },

    /**
     * Delete a custom template
     */
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/visual-templates/${id}`);
    },

    // ── Generic Image Endpoints for Template Editor ───────────────────────

    /**
     * Search Unsplash for stock photos to use as template placeholders.
     */
    searchUnsplash: async (query: string): Promise<{
        id: string;
        url_regular: string;
        url_small: string;
        url_thumb: string;
        alt: string;
        photographer: string;
        photographer_url: string;
    }[]> => {
        const response = await apiClient.get('/visual-templates/unsplash/search', {
            params: { query }
        });
        return response.data;
    },

    /**
     * Upload a custom image to be used as a template variable placeholder.
     */
    uploadImage: async (file: File): Promise<{ url: string; key: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post('/visual-templates/upload-image', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }
};
