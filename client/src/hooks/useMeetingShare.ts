import {
  useMeetingsControllerCreateShareLink,
  useMeetingsControllerDeleteShareLink,
  useMeetingsControllerGetShareLink,
  useMeetingsControllerUpdateShareLink
} from '@/api/generated/knowtedAPI';
import type {
  CreateMeetingShareDto,
  MeetingShareResponseDto,
  UpdateMeetingShareDto
} from '@/api/generated/models';
import { toast } from '@/lib/toast';
import { useEffect, useState } from 'react';

export interface ShareLink {
  id: string;
  share_token: string;
  created_at: string;
  expires_at: string | null;
  is_enabled: boolean;
}

export const useMeetingShare = (meetingId: string, organizationId?: string) => {
  const [shareLink, setShareLink] = useState<MeetingShareResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // API hooks
  const createShareLinkMutation = useMeetingsControllerCreateShareLink();
  const getShareLinkQuery = useMeetingsControllerGetShareLink(
    meetingId,
    { organization_id: organizationId || '' },
    {
      query: {
        enabled: !!meetingId && !!organizationId
      }
    }
  );
  const updateShareLinkMutation = useMeetingsControllerUpdateShareLink();
  const deleteShareLinkMutation = useMeetingsControllerDeleteShareLink();

  const fetchExistingShareLink = async (): Promise<void> => {
    if (!meetingId || !organizationId) {
      return;
    }

    try {
      const response = await getShareLinkQuery.refetch();
      if (response.data) {
        setShareLink(response.data);
      }
    } catch (error) {
      console.error('Error fetching share link:', error);
    }
  };

  const generateShareLink = async (expiryDate?: string): Promise<void> => {
    if (!meetingId || !organizationId) {
      return;
    }

    setIsLoading(true);
    try {
      const createDto: CreateMeetingShareDto = {
        meeting_id: meetingId,
        expires_at: expiryDate
      };

      const result = await createShareLinkMutation.mutateAsync({
        id: meetingId,
        data: createDto,
        params: { organization_id: organizationId }
      });

      // Handle both direct response and AxiosResponse
      const shareData = 'data' in result ? result.data : result;
      setShareLink(shareData);
      toast.success('Share link created successfully!');
    } catch (error) {
      console.error('Error generating share link:', error);
      toast.error('Failed to create share link');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLinkStatus = async (enabled: boolean): Promise<void> => {
    if (!shareLink || !meetingId || !organizationId) {
      return;
    }

    try {
      const updateDto: UpdateMeetingShareDto = {
        is_enabled: enabled
      };

      const result = await updateShareLinkMutation.mutateAsync({
        id: meetingId,
        data: updateDto,
        params: { organization_id: organizationId }
      });

      // Handle both direct response and AxiosResponse
      const shareData = 'data' in result ? result.data : result;
      setShareLink(shareData);
      toast.success(enabled ? 'Link activated' : 'Link deactivated');
    } catch (error) {
      toast.error('Failed to update link status');
    }
  };

  const deleteShareLink = async (): Promise<void> => {
    if (!meetingId || !organizationId) {
      return;
    }

    try {
      await deleteShareLinkMutation.mutateAsync({
        id: meetingId,
        params: { organization_id: organizationId }
      });

      setShareLink(null);
      toast.success('Share link deleted');
    } catch (error) {
      toast.error('Failed to delete share link');
    }
  };

  useEffect(() => {
    if (meetingId && organizationId) {
      fetchExistingShareLink();
    }
  }, [meetingId, organizationId]);

  const isLoadingState = isLoading ||
    createShareLinkMutation.isPending ||
    updateShareLinkMutation.isPending ||
    deleteShareLinkMutation.isPending;

  return {
    shareLink,
    isLoading: isLoadingState,
    generateShareLink,
    toggleLinkStatus,
    deleteShareLink
  };
};
