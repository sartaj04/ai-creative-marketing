import { apiClient } from './client';

export interface AnalyticsSummary {
  total_drafts_generated: number;
  drafts_approved: number;
  drafts_rejected: number;
  drafts_published: number;
  approval_rate: number;
  avg_confidence: number;
  period: string;
  period_start: string;
  period_end: string;
}

export interface TopicMetric {
  topic: string;
  count: number;
  approval_rate: number;
}

export interface TopicAnalytics {
  topics: TopicMetric[];
  period: string;
}

export interface FormatMetric {
  format: string;
  count: number;
  approval_rate: number;
}

export interface FormatAnalytics {
  formats: FormatMetric[];
  period: string;
}

export const analyticsApi = {
  getSummary: async (profileId: string, period: string = '30d'): Promise<AnalyticsSummary> => {
    const response = await apiClient.get('/analytics/summary', {
      params: { profile_id: profileId, period },
    });
    return response.data;
  },

  getTopics: async (profileId: string, period: string = '30d'): Promise<TopicAnalytics> => {
    const response = await apiClient.get('/analytics/topics', {
      params: { profile_id: profileId, period },
    });
    return response.data;
  },

  getFormats: async (profileId: string, period: string = '30d'): Promise<FormatAnalytics> => {
    const response = await apiClient.get('/analytics/formats', {
      params: { profile_id: profileId, period },
    });
    return response.data;
  },
};
