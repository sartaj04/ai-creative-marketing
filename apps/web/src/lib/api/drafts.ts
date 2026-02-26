import { apiClient } from './client';
import { MediaAsset } from './media';

export type DraftStatus = 'inbox' | 'approved' | 'scheduled' | 'published' | 'rejected';
export type DraftFormat = 'post' | 'thread' | 'carousel' | 'article';
export type DraftAction = 'approve' | 'reject' | 'edit' | 'schedule' | 'publish';
export type PlatformType = 'linkedin' | 'twitter';

// ── DraftSlide ────────────────────────────────────────────────────────

export interface DraftSlide {
    id: string;
    draft_id: string;
    slide_template_id: string | null;
    rendered_html: string;
    filled_variables: Record<string, string>;
    order: number;
    created_at: string;
}

// ── Draft ─────────────────────────────────────────────────────────────

export interface Draft {
    id: string;
    profile_id: string;
    opportunity_id: string | null;
    template_id: string | null;          // legacy FK to old templates table
    visual_template_id: string | null;   // FK to visual_templates
    status: DraftStatus;
    format: DraftFormat;
    hook: string;
    body: string;
    topic: string | null;
    confidence: number;
    sources_json: unknown[];
    generated_by: string | null;
    scheduled_at: string | null;
    published_at: string | null;
    platform: PlatformType | null;
    media_assets: MediaAsset[];
    slides: DraftSlide[];                // rendered slide records (empty for non-visual drafts)
    created_at: string;
    updated_at: string;
}

// ── Request / Response types ──────────────────────────────────────────

export interface DraftListResponse {
    drafts: Draft[];
    total: number;
    limit: number;
    offset: number;
}

export interface DraftActionRequest {
    action: DraftAction;
    feedback?: string;
    edited_hook?: string;
    edited_body?: string;
}

export interface DraftScheduleRequest {
    scheduled_time: string;
    platform: PlatformType;
}

export interface DraftGenerateRequest {
    template_id: string;
    profile_id: string;
    brand_context?: {
        primary_color?: string;
        secondary_color?: string;
        font_family?: string;
        persona_summary?: string;
        tone?: string;
    } | null;
}

// ── API client ────────────────────────────────────────────────────────

export const draftsApi = {
    list: async (params?: {
        profile_id?: string;
        status?: DraftStatus;
        generated_by?: string;
        limit?: number;
        offset?: number;
    }): Promise<DraftListResponse> => {
        const response = await apiClient.get('/drafts', { params });
        return response.data as DraftListResponse;
    },

    get: async (id: string): Promise<Draft> => {
        const response = await apiClient.get(`/drafts/${id}`);
        return response.data as Draft;
    },

    action: async (id: string, data: DraftActionRequest): Promise<Draft> => {
        const response = await apiClient.post(`/drafts/${id}/action`, data);
        return response.data as Draft;
    },

    schedule: async (id: string, data: DraftScheduleRequest): Promise<Draft> => {
        const response = await apiClient.put(`/drafts/${id}/schedule`, data);
        return response.data as Draft;
    },

    updateStatus: async (id: string, draftStatus: DraftStatus): Promise<Draft> => {
        const response = await apiClient.put(`/drafts/${id}/status`, { status: draftStatus });
        return response.data as Draft;
    },

    /**
     * Generate a new Draft by filling a saved VisualTemplate with AI-generated content.
     *
     * Mode 2 (deterministic): reads stored HTML from template, calls LLM once
     * to fill variables, renders via Playwright, returns Draft with slides + media_assets.
     */
    generateFromTemplate: async (data: DraftGenerateRequest): Promise<Draft> => {
        const response = await apiClient.post('/drafts/generate', data);
        return response.data as Draft;
    },
};
