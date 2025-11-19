import { useAuth } from '@/context/AuthContext';
import { meetingsService } from '@/integrations/api/services/meetings.service';
import { Database } from '@/integrations/supabase/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type Meeting = Database['public']['Tables']['meetings']['Row'];
type MeetingInsert = Database['public']['Tables']['meetings']['Insert'];
type MeetingUpdate = Database['public']['Tables']['meetings']['Update'];

export const useMeetings = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

  const meetings = useQuery<Meeting[]>({
    queryKey: ['meetings', organization?.id],
    queryFn: () => meetingsService.getMeetings(organization?.id || ''),
    enabled: !!organization?.id,
  });

  const createMeeting = useMutation<Meeting, Error, MeetingInsert>({
    mutationFn: (data) => meetingsService.createMeeting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });

  const updateMeeting = useMutation<Meeting, Error, { id: string; data: MeetingUpdate }>({
    mutationFn: ({ id, data }) => meetingsService.updateMeeting(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });

  const deleteMeeting = useMutation<void, Error, string>({
    mutationFn: meetingsService.deleteMeeting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });

  return {
    meetings: meetings.data || [],
    isLoading: meetings.isLoading,
    error: meetings.error,
    createMeeting: createMeeting.mutate,
    updateMeeting: updateMeeting.mutate,
    deleteMeeting: deleteMeeting.mutate,
    isCreating: createMeeting.isPending,
    isUpdating: updateMeeting.isPending,
    isDeleting: deleteMeeting.isPending,
  };
};
