import { apiClient } from './client';

// ============================================
// Core Identity Types
// ============================================

export interface IdentityGraph {
  id: string;
  profile_id: string;

  // Core identity
  current_role: string | null;
  industry: string | null;

  // Professional details
  expertise_areas: string[];
  career_highlights: string[];
  career_stage: string | null;
  education: any[];
  bio_summary: string | null;

  // Brand Strategy
  target_audience: string | null;
  desired_positioning: string | null;
  unique_angles: string[];
  aspirations: string | null;
  goals: string | null;

  // Personality & Content
  interests: string[];
  beliefs: string[];
  contrarian_views: string[];

  // Content Strategy
  content_pillars: string[];
  narrative_themes: string[];

  // Legacy fields
  themes: string[];
  expertise_keywords: string[];
  tone_markers: Record<string, number>;
  audience_notes: Record<string, any>;
  authority_angles: string[];

  // Metadata
  completeness_score: number;
  version: number;
  last_updated_at: string;
  created_at: string;
}

export interface IdentityGraphUpdate {
  // Core identity
  current_role?: string;
  industry?: string;

  // Professional details
  expertise_areas?: string[];
  career_highlights?: string[];
  career_stage?: string;
  education?: any[];
  bio_summary?: string;

  // Brand Strategy
  target_audience?: string;
  desired_positioning?: string;
  unique_angles?: string[];
  aspirations?: string;
  goals?: string;

  // Personality & Content
  interests?: string[];
  beliefs?: string[];
  contrarian_views?: string[];

  // Content Strategy
  content_pillars?: string[];
  narrative_themes?: string[];

  // Legacy fields
  themes?: string[];
  expertise_keywords?: string[];
  tone_markers?: Record<string, number>;
  audience_notes?: Record<string, any>;
  authority_angles?: string[];
}

// ============================================
// Style Profile Types
// ============================================

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
  writing_samples_count?: number;
}

export interface StyleProfileUpdate {
  tone_sliders?: Partial<ToneSliders>;
  format_preferences?: Partial<FormatPreferences>;
  taboo_list?: string[];
  preferred_hooks?: string[];
}

// ============================================
// Identity Universe Types (Unified)
// ============================================

export interface PersonaData {
  persona_prompt: string | null;
  persona_prompt_updated_at: string | null;
  learned_preferences: string | null;
  learned_preferences_updated_at: string | null;
}

export interface IdentityUniverse {
  identity_graph: IdentityGraph;
  style_profile: StyleProfile | null;
  persona: PersonaData;
  profile_id: string;
  profile_name: string;
  location: string[] | null;
  completeness_score: number;
}

export interface RegenerationField {
  field_name: string;
  current_value: any;
  proposed_value: any;
  field_category: 'identity' | 'style' | 'persona';
}

export interface RegenerationPreview {
  profile_id: string;
  changes: RegenerationField[];
  new_persona_prompt: string | null;
  regeneration_scope: 'full' | 'partial';
}

export interface RegenerationRequest {
  scope: 'full' | 'partial';
  fields_to_regenerate?: string[];
}

// ============================================
// API Client
// ============================================

export const identityApi = {
  // Legacy endpoints
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

  // Unified Identity Universe endpoints
  getIdentityUniverse: async (profileId: string): Promise<IdentityUniverse> => {
    const response = await apiClient.get(`/profiles/${profileId}/identity-universe`);
    return response.data;
  },

  previewRegeneration: async (
    profileId: string,
    request: RegenerationRequest
  ): Promise<RegenerationPreview> => {
    const response = await apiClient.post(
      `/profiles/${profileId}/identity-universe/regenerate-preview`,
      request
    );
    return response.data;
  },
};
