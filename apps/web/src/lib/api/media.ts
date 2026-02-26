import { apiClient } from './client';

export interface MediaAsset {
    id: string;
    draft_id: string;
    type: 'image' | 'carousel_slide' | 'cover_image';
    storage_url: string;
    alt_text: string | null;
    slide_index: number | null;
    visual_template_id: string | null;
    generation_prompt: string | null;
    metadata_json: Record<string, any>;
    created_at: string;
}

export interface ImageRenderRequest {
    draft_id: string;
    template_id: string;
    variables: Record<string, any>;
    brand_overrides?: Record<string, string> | null;
}

export interface ImageGenerateRequest {
    draft_id: string;
    prompt?: string | null;
    style?: string;
    width?: number;
    height?: number;
}

export interface ImageUploadResponse {
    media_asset: MediaAsset;
    message: string;
}

export const mediaApi = {
    /**
     * Render an image from a visual template with variables
     */
    renderTemplate: async (data: ImageRenderRequest): Promise<ImageUploadResponse> => {
        const response = await apiClient.post('/media/render', data);
        return response.data;
    },

    /**
     * Generate an AI image using Gemini Imagen
     */
    generateImage: async (data: ImageGenerateRequest): Promise<ImageUploadResponse> => {
        const response = await apiClient.post('/media/generate', data);
        return response.data;
    },

    /**
     * Upload a user-provided image
     */
    uploadImage: async (
        draftId: string,
        file: File,
        altText?: string,
        slideIndex?: number,
    ): Promise<ImageUploadResponse> => {
        const formData = new FormData();
        formData.append('draft_id', draftId);
        formData.append('file', file);
        if (altText) formData.append('alt_text', altText);
        if (slideIndex !== undefined) formData.append('slide_index', String(slideIndex));

        const response = await apiClient.post('/media/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    /**
     * List all media assets for a draft
     */
    listDraftMedia: async (draftId: string): Promise<MediaAsset[]> => {
        const response = await apiClient.get(`/media/draft/${draftId}`);
        return response.data;
    },

    /**
     * Delete a media asset
     */
    deleteMedia: async (assetId: string): Promise<void> => {
        await apiClient.delete(`/media/${assetId}`);
    },
};
