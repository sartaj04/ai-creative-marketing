import { apiClient } from './client';

export interface IdentityGraph {
  id: string;
  profile_id: string;
  themes: string[];
  expertise_keywords: string[];
  tone_markers: Record<string, number>;
  audience_notes: Record<string, any>;
  authority_angles: string[];
  narrative_themes: string[];
  version: number;
  last_updated_at: string;
  created_at: string;
}

export interface IdentityGraphUpdate {
  themes?: string[];
  expertise_keywords?: string[];
  tone_markers?: Record<string, number>;
  audience_notes?: Record<string, any>;
  authority_angles?: string[];
  narrative_themes?: string[];
}

export interface ToneSliders {
  formal_casual: number;
  technical_simple: number;
  serious_playful: number;
  humble_confident: number;
}

export interface FormatPreferences {
  post: number;
  thread: number;
  carousel: number;
}

export interface StyleProfile {
  id: string;
  profile_id: string;
  tone_sliders: ToneSliders;
  format_preferences: FormatPreferences;
  taboo_list: string[];
  preferred_hooks: string[];
  weights: Record<string, any>;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface StyleProfileUpdate {
  tone_sliders?: Partial<ToneSliders>;
  format_preferences?: Partial<FormatPreferences>;
  taboo_list?: string[];
  preferred_hooks?: string[];
}

export const identityApi = {
  getIdentityGraph: async (profileId: string): Promise<IdentityGraph> => {
    const response = await apiClient.get(`/profiles/${profileId}/identity-graph`);
    return response.data;
  },

  updateIdentityGraph: async (
    profileId: string,
    data: IdentityGraphUpdate
  ): Promise<IdentityGraph> => {
    const response = await apiClient.put(`/profiles/${profileId}/identity-graph`, data);
    return response.data;
  },

  getStyleProfile: async (profileId: string): Promise<StyleProfile> => {
    const response = await apiClient.get(`/profiles/${profileId}/style-profile`);
    return response.data;
  },

  updateStyleProfile: async (
    profileId: string,
    data: StyleProfileUpdate
  ): Promise<StyleProfile> => {
    const response = await apiClient.put(`/profiles/${profileId}/style-profile`, data);
    return response.data;
  },
};
