import { apiClient } from './client';

export interface GeneratorResponse {
  draft_id: string;
  hook: string;
  body: string;
  topic: string | null;
  confidence: number;
  message: string;
}

export interface ScratchRequest {
  profile_id: string;
  topic: string;
  key_points: string[];
  goal: string;
  template_id?: string | null;
}

export interface YouTubeRequest {
  profile_id: string;
  youtube_url: string;
  template_id?: string | null;
}

export interface ArticleRequest {
  profile_id: string;
  article_url: string;
  template_id?: string | null;
}

export interface FormatRequest {
  profile_id: string;
  content: string;
  template_id?: string | null;
}

// Template Recommendation Types
export interface TemplateRecommendation {
  id: string;
  name: string;
  description: string | null;
  category: string;
  content: string;
  match_score: number;
  usage_count: number;
  tags: string[];
}

export interface TemplateRecommendationsResponse {
  templates: TemplateRecommendation[];
  source_type: string;
  topic_hint: string | null;
}

export const generatorsApi = {
  /**
   * Get recommended templates for a generation mode
   */
  recommendTemplates: async (params: {
    profile_id: string;
    source_type: string;
    topic_hint?: string;
    goal?: string;
    search?: string;
    tags?: string[];
    limit?: number;
  }): Promise<TemplateRecommendationsResponse> => {
    const queryParams: any = { ...params };
    if (params.tags) {
      queryParams.tags = params.tags.join(',');
    }
    const response = await apiClient.get('/generators/templates/recommend', { params: queryParams });
    return response.data;
  },

  /**
   * Generate a draft from scratch based on topic and key points
   */
  scratch: async (data: ScratchRequest): Promise<GeneratorResponse> => {
    const response = await apiClient.post('/generators/scratch', data);
    return response.data;
  },

  /**
   * Generate a draft from an audio file
   */
  audio: async (profileId: string, file: File, templateId?: string | null): Promise<GeneratorResponse> => {
    const formData = new FormData();
    formData.append('profile_id', profileId);
    formData.append('file', file);
    if (templateId) {
      formData.append('template_id', templateId);
    }

    const response = await apiClient.post('/generators/audio', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Generate a draft from a PDF file
   */
  pdf: async (profileId: string, file: File, templateId?: string | null): Promise<GeneratorResponse> => {
    const formData = new FormData();
    formData.append('profile_id', profileId);
    formData.append('file', file);
    if (templateId) {
      formData.append('template_id', templateId);
    }

    const response = await apiClient.post('/generators/pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Generate a draft from a YouTube video transcript
   */
  youtube: async (data: YouTubeRequest): Promise<GeneratorResponse> => {
    const response = await apiClient.post('/generators/youtube', data);
    return response.data;
  },

  /**
   * Generate a draft from an article URL
   */
  article: async (data: ArticleRequest): Promise<GeneratorResponse> => {
    const response = await apiClient.post('/generators/article', data);
    return response.data;
  },

  /**
   * Generate a formatted draft from raw content
   */
  format: async (data: FormatRequest): Promise<GeneratorResponse> => {
    const response = await apiClient.post('/generators/format', data);
    return response.data;
  },
};
