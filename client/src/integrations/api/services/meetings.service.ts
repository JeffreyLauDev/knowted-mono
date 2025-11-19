import { Database } from '@/integrations/supabase/types';
import { apiClient } from '../client';

type Meeting = Database['public']['Tables']['meetings']['Row'];

export const meetingsService = {
  getMeetings: async (organizationId: string) => {
    const response = await apiClient.get<Meeting[]>(`/api/v1/meetings`, {
      params: { organization_id: organizationId }
    });
    return response.data;
  },

  getMeeting: async (meetingId: string) => {
    const response = await apiClient.get<Meeting>(`/api/v1/meetings/${meetingId}`);
    return response.data;
  },

  createMeeting: async (meetingData: Database['public']['Tables']['meetings']['Insert']) => {
    const response = await apiClient.post<Meeting>('/api/v1/meetings', meetingData);
    return response.data;
  },

  updateMeeting: async (meetingId: string, meetingData: Database['public']['Tables']['meetings']['Update']) => {
    const response = await apiClient.patch<Meeting>(`/api/v1/meetings/${meetingId}`, meetingData);
    return response.data;
  },

  deleteMeeting: async (meetingId: string) => {
    await apiClient.delete(`/api/v1/meetings/${meetingId}`);
  }
}; 