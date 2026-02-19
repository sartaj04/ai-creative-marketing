import { apiClient } from './client';

export type ProfileType = 'individual' | 'enterprise';

export interface ProfileSource {
  id: string;
  profile_id: string;
  linkedin_url: string | null;
  website_url: string | null;
  resume_path: string | null;
  manual_text: string | null;
  rss_urls: string[];
  last_synced_at: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  type: ProfileType;
  name: string;
  description: string | null;
  location: string[] | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sources: ProfileSource | null;
  role?: 'owner' | 'member';
}

export interface CreateProfileRequest {
  name: string;
  type: ProfileType;
  description?: string;
  location?: string[];
  sources?: {
    linkedin_url?: string;
    website_url?: string;
    manual_text?: string;
    rss_urls?: string[];
  };
}

export interface UpdateProfileRequest {
  name?: string;
  description?: string;
  location?: string[];
  is_active?: boolean;
}

export const profilesApi = {
  list: async (): Promise<{ profiles: Profile[]; total: number }> => {
    const response = await apiClient.get('/profiles');
    return response.data;
  },

  get: async (id: string): Promise<Profile> => {
    const response = await apiClient.get(`/profiles/${id}`);
    return response.data;
  },

  create: async (data: CreateProfileRequest): Promise<Profile> => {
    const response = await apiClient.post('/profiles', data);
    return response.data;
  },

  update: async (id: string, data: UpdateProfileRequest): Promise<Profile> => {
    const response = await apiClient.put(`/profiles/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/profiles/${id}`);
  },

  triggerIngestion: async (id: string): Promise<{ message: string; task_id: string }> => {
    const response = await apiClient.post(`/profiles/${id}/ingest`);
    return response.data;
  },

  updateSources: async (id: string, data: { linkedin_url?: string; website_url?: string }): Promise<ProfileSource> => {
    const response = await apiClient.put(`/profiles/${id}/sources`, data);
    return response.data;
  },

  uploadResume: async (id: string, file: File): Promise<{ success: boolean; message: string; filename: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/profiles/${id}/sources/upload-resume`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
