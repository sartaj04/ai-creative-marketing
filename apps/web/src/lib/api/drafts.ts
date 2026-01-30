import { apiClient } from './client';

export type DraftStatus = 'inbox' | 'approved' | 'scheduled' | 'published' | 'rejected';
export type DraftFormat = 'post' | 'thread' | 'carousel' | 'article';
export type DraftAction = 'approve' | 'reject' | 'edit' | 'schedule' | 'publish';
export type PlatformType = 'linkedin' | 'twitter';

export interface Draft {
  id: string;
  profile_id: string;
  opportunity_id: string | null;
  template_id: string | null;
  status: DraftStatus;
  format: DraftFormat;
  hook: string;
  body: string;
  topic: string | null;
  confidence: number;
  sources_json: any[];
  generated_by: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  platform: PlatformType | null;
  created_at: string;
  updated_at: string;
}

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

export const draftsApi = {
  list: async (params?: {
    profile_id?: string;
    status?: DraftStatus;
    generated_by?: string;
    limit?: number;
    offset?: number;
  }): Promise<DraftListResponse> => {
    const response = await apiClient.get('/drafts', { params });
    return response.data;
  },

  get: async (id: string): Promise<Draft> => {
    const response = await apiClient.get(`/drafts/${id}`);
    return response.data;
  },

  action: async (id: string, data: DraftActionRequest): Promise<Draft> => {
    const response = await apiClient.post(`/drafts/${id}/action`, data);
    return response.data;
  },

  schedule: async (id: string, data: DraftScheduleRequest): Promise<any> => {
    const response = await apiClient.put(`/drafts/${id}/schedule`, data);
    return response.data;
  },

  updateStatus: async (id: string, status: DraftStatus): Promise<Draft> => {
    const response = await apiClient.put(`/drafts/${id}/status`, { status });
    return response.data;
  },
};
