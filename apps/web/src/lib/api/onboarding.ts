import { apiClient } from './client';

export interface StartResponse {
    message: string;
    step?: string;
    complete: boolean;
}

export interface OnboardingStatusResponse {
    is_complete: boolean;
    step: string | null;
    completeness_score: number;
    has_extraction: boolean;
    extracted_sources: string[];
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

export interface MessageResponse {
    message: string;
    complete: boolean;
    ui_hint?: 'show_upload' | 'show_linkedin_helper' | 'show_confirmation' | null;
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

export const onboardingApi = {
    /**
     * Get onboarding status without modifying state (read-only)
     */
    getStatus: async (): Promise<OnboardingStatusResponse> => {
        const { data } = await apiClient.get<OnboardingStatusResponse>('/onboarding/status');
        return data;
    },

    /**
     * Start or resume onboarding conversation
     */
    start: async (method: string = 'chat'): Promise<StartResponse> => {
        const { data } = await apiClient.post<StartResponse>('/onboarding/start', { method });
        return data;
    },

    /**
     * Send a message during onboarding conversation
     */
    sendMessage: async (message: string): Promise<MessageResponse> => {
        const { data } = await apiClient.post<MessageResponse>('/onboarding/message', { message });
        return data;
    },

    /**
     * Extract data from LinkedIn profile
     */
    extract: async (source_type: string, input_value: string): Promise<ExtractResponse> => {
        const { data } = await apiClient.post<ExtractResponse>('/onboarding/extract', { source_type, input_value });
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
    }
};
