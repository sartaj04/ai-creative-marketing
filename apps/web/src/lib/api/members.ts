import { apiClient } from './client';

export interface Member {
  id: string;
  profile_id: string;
  user_id: string | null;
  role: 'owner' | 'member';
  status: 'pending' | 'accepted' | 'declined';
  invited_email: string | null;
  user_name: string | null;
  user_email: string | null;
  created_at: string;
}

export interface Invitation {
  id: string;
  profile_id: string;
  profile_name: string;
  role: string;
  invited_by_name: string | null;
  created_at: string;
}

export const membersApi = {
  list: async (profileId: string): Promise<{ members: Member[]; total: number }> => {
    const response = await apiClient.get(`/profiles/${profileId}/members`);
    return response.data;
  },

  invite: async (profileId: string, email: string): Promise<Member> => {
    const response = await apiClient.post(`/profiles/${profileId}/members/invite`, { email });
    return response.data;
  },

  remove: async (profileId: string, memberId: string): Promise<void> => {
    await apiClient.delete(`/profiles/${profileId}/members/${memberId}`);
  },

  leave: async (profileId: string): Promise<void> => {
    await apiClient.post(`/profiles/${profileId}/leave`);
  },

  listInvitations: async (): Promise<{ invitations: Invitation[]; total: number }> => {
    const response = await apiClient.get('/invitations');
    return response.data;
  },

  acceptInvitation: async (invitationId: string): Promise<void> => {
    await apiClient.post(`/invitations/${invitationId}/accept`);
  },

  declineInvitation: async (invitationId: string): Promise<void> => {
    await apiClient.post(`/invitations/${invitationId}/decline`);
  },
};
