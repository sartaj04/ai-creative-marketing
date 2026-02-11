import { apiClient } from './client';
import { DraftFormat } from './drafts';

export type TemplateCategory =
  | 'myth_buster'
  | 'tips'
  | 'story'
  | 'framework'
  | 'contrarian'
  | 'lessons'
  | 'listicle'
  | 'question'
  | 'comparison'
  | 'announcement'
  | 'case_study'
  | 'common_mistakes';

export type ContributionStatus = 'none' | 'pending' | 'approved' | 'rejected';

export type TemplateScope = 'system' | 'user' | 'contributed' | 'all';

export interface Template {
  id: string;
  name: string;
  description: string | null;
  content: string;
  format: DraftFormat;
  category: TemplateCategory;
  tags: string[];
  variables: Record<string, any>;
  use_cases: string[];
  tone_fit: string[];
  platform: string;
  image_template: string | null;
  carousel_slides: any[] | null;
  media_placeholders: Record<string, any> | null;
  // Ownership and contribution
  is_system: boolean;
  is_contributed: boolean;
  contribution_status: ContributionStatus;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  usage_count: number;
  approval_rate: number;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  content: string;
  format: DraftFormat;
  category: TemplateCategory;
  tags?: string[];
  use_cases?: string[];
  tone_fit?: string[];
  platform?: string;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  content?: string;
  format?: DraftFormat;
  category?: TemplateCategory;
  tags?: string[];
  use_cases?: string[];
  tone_fit?: string[];
  platform?: string;
  is_active?: boolean;
}

// Admin system template types
export interface SystemTemplateCreateRequest {
  content: string;
  name?: string;
  description?: string;
  format?: DraftFormat;
  category?: TemplateCategory;
  tags?: string[];
  use_cases?: string[];
  tone_fit?: string[];
  platform?: string;
}

export interface AnalyzeTemplateRequest {
  content: string;
  name?: string;
  description?: string;
}

export interface AnalyzeTemplateResponse {
  variables: Record<string, any>;
  category: TemplateCategory;
  tags: string[];
  use_cases: string[];
  tone_fit: string[];
  suggested_name: string | null;
  suggested_description: string | null;
}

// Contribution types
export interface ContributeResponse {
  template_id: string;
  contribution_status: ContributionStatus;
  message: string;
}

export interface ReviewContributionRequest {
  approved: boolean;
  rejection_reason?: string;
}

export const templatesApi = {
  // ============ User Template Endpoints ============

  list: async (params?: {
    category?: TemplateCategory;
    format?: DraftFormat;
    tags?: string;
    is_active?: boolean;
    scope?: TemplateScope;
    limit?: number;
    offset?: number;
  }): Promise<{ templates: Template[]; total: number }> => {
    const response = await apiClient.get('/templates', { params });
    return response.data;
  },

  get: async (id: string): Promise<Template> => {
    const response = await apiClient.get(`/templates/${id}`);
    return response.data;
  },

  create: async (data: CreateTemplateRequest): Promise<Template> => {
    const response = await apiClient.post('/templates', data);
    return response.data;
  },

  update: async (id: string, data: UpdateTemplateRequest): Promise<Template> => {
    const response = await apiClient.put(`/templates/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/templates/${id}`);
  },

  duplicate: async (id: string): Promise<Template> => {
    const response = await apiClient.post(`/templates/${id}/duplicate`);
    return response.data;
  },

  match: async (data: {
    profile_id: string;
    topic?: string;
    format?: DraftFormat;
    category?: TemplateCategory;
    tone_preferences?: Record<string, number>;
    limit?: number;
  }): Promise<{ templates: Template[]; match_scores: Record<string, number> }> => {
    const response = await apiClient.post('/templates/match', data);
    return response.data;
  },

  // ============ Contribution Endpoints ============

  contribute: async (templateId: string): Promise<ContributeResponse> => {
    const response = await apiClient.post('/templates/contribute', {
      template_id: templateId,
    });
    return response.data;
  },

  withdrawContribution: async (templateId: string): Promise<ContributeResponse> => {
    const response = await apiClient.post(
      `/templates/${templateId}/withdraw-contribution`
    );
    return response.data;
  },

  // ============ Admin System Template Endpoints ============

  admin: {
    analyze: async (data: AnalyzeTemplateRequest): Promise<AnalyzeTemplateResponse> => {
      const response = await apiClient.post('/templates/admin/analyze', data);
      return response.data;
    },

    createSystemTemplate: async (
      data: SystemTemplateCreateRequest
    ): Promise<Template> => {
      const response = await apiClient.post('/templates/admin/system', data);
      return response.data;
    },

    listSystemTemplates: async (params?: {
      category?: TemplateCategory;
      format?: DraftFormat;
      is_active?: boolean;
      limit?: number;
      offset?: number;
    }): Promise<{ templates: Template[]; total: number }> => {
      const response = await apiClient.get('/templates/admin/system', { params });
      return response.data;
    },

    listContributions: async (params?: {
      status?: ContributionStatus;
      limit?: number;
      offset?: number;
    }): Promise<{ templates: Template[]; total: number }> => {
      const response = await apiClient.get('/templates/admin/contributions', {
        params,
      });
      return response.data;
    },

    reviewContribution: async (
      templateId: string,
      data: ReviewContributionRequest
    ): Promise<ContributeResponse> => {
      const response = await apiClient.post(
        `/templates/admin/contributions/${templateId}/review`,
        data
      );
      return response.data;
    },
  },
};
