import { apiClient } from './client';

export interface OnboardingStatusResponse {
    is_complete: boolean;
    step: string | null;
    completeness_score: number;
    has_extraction: boolean;
    extracted_sources: string[];
    profile_id?: string;
    writing_samples_count?: number;
}

export interface ExtractionSummary {
    source: string;
    fields_extracted: string[];
    highlights: Record<string, any>;
}

export interface ExtractResponse {
    success: boolean;
    summary: string;
    data?: Record<string, any>;
    extraction_summary?: ExtractionSummary;
    error?: string;
}

// Step-specific data interfaces
export interface ProfessionalStepData {
    current_role: string;
    industry: string;
    years_experience?: string;
    expertise_areas: string[];
    career_highlight?: string;
}

export interface InterestsStepData {
    interests: string[];
    aspirations?: string;
    topics_of_interest: string[];
}

export interface VoiceStepData {
    selected_post_ids: string[];
}

export interface StepSaveRequest {
    step_name: 'professional' | 'interests' | 'voice';
    professional_data?: ProfessionalStepData;
    interests_data?: InterestsStepData;
    voice_data?: VoiceStepData;
}

export interface StepSaveResponse {
    success: boolean;
    next_step?: string;
    message?: string;
}

// Conversational onboarding interfaces
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface ConversationalExtractedData {
    current_role: string;
    industry: string;
    years_experience: string;
    expertise_areas: string[];
    career_highlight: string;
    interests: string[];
    topics_of_interest: string[];
    aspirations: string;
    tone_formal_casual: number | null;
    tone_technical_simple: number | null;
    tone_serious_playful: number | null;
    tone_humble_confident: number | null;
    bio_summary: string;
}

export interface ChatRequest {
    message: string;
    conversation_history: ChatMessage[];
    mode?: 'onboarding' | 'refinement';
}

export interface ChatResponse {
    response: string;
    extracted_data: ConversationalExtractedData;
    is_complete: boolean;
    conversation_history: ChatMessage[];
}

export interface LinkedInURLRequest {
    linkedin_url: string;
}

export interface LinkedInURLResponse {
    success: boolean;
    message: string;
    profile_extracted: boolean;
    posts_scraping_queued: boolean;
    career_timeline_extracted: boolean;
    suggested_topics: string[];
}

export interface ContentFocusRequest {
    primary_topics: string[];
    custom_topics: string[];
}

export interface ContentFocusResponse {
    success: boolean;
    topics_saved: number;
}

export const onboardingApi = {
    /**
     * Get onboarding status without modifying state (read-only)
     */
    getStatus: async (): Promise<OnboardingStatusResponse> => {
        const { data } = await apiClient.get<OnboardingStatusResponse>('/onboarding/status');
        return data;
    },

    /**
     * Submit LinkedIn profile URL for scraping profile + posts
     */
    submitLinkedInUrl: async (linkedinUrl: string): Promise<LinkedInURLResponse> => {
        const { data } = await apiClient.post<LinkedInURLResponse>('/onboarding/linkedin-url', {
            linkedin_url: linkedinUrl,
        });
        return data;
    },

    /**
     * Upload and extract data from LinkedIn profile PDF
     */
    uploadResume: async (file: File): Promise<ExtractResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await apiClient.post<ExtractResponse>('/onboarding/upload-resume', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return data;
    },

    /**
     * Save step data during onboarding
     */
    saveStep: async (request: StepSaveRequest): Promise<StepSaveResponse> => {
        const { data } = await apiClient.post<StepSaveResponse>('/onboarding/save-step', request);
        return data;
    },

    /**
     * Complete onboarding and finalize profile
     */
    complete: async (): Promise<{ success: boolean; redirect_url: string }> => {
        const { data } = await apiClient.post<{ success: boolean; redirect_url: string }>('/onboarding/complete', {});
        return data;
    },

    /**
     * Save content focus topics during onboarding
     */
    saveContentFocus: async (primaryTopics: string[], customTopics: string[] = []): Promise<ContentFocusResponse> => {
        const { data } = await apiClient.post<ContentFocusResponse>('/onboarding/content-focus', {
            primary_topics: primaryTopics,
            custom_topics: customTopics,
        });
        return data;
    },

    /**
     * Conversational onboarding chat with Pixo
     */
    chat: async (request: ChatRequest): Promise<ChatResponse> => {
        const { data } = await apiClient.post<ChatResponse>('/onboarding/chat', request);
        return data;
    }
};
