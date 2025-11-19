import { useOrganizationsControllerAcceptInvitation, useOrganizationsControllerGetMyInvitations } from '@/api/generated/knowtedAPI';
import type { AcceptInvitationDto, InvitationResponseDto } from '@/api/generated/models';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export const useInvitations = (): {
  invitations: InvitationResponseDto[] | undefined;
  isLoading: boolean;
  hasInvitations: boolean;
  acceptingInvitation: string | null;
  handleAcceptInvitation: (invitationId: string) => void;
  refetch: () => void;
} => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [acceptingInvitation, setAcceptingInvitation] = useState<string | null>(null);

  // Get user's invitations
  const { data: invitations, isLoading, refetch } = useOrganizationsControllerGetMyInvitations({
    query: {
      enabled: !!user,
      refetchInterval: 30000, // Refetch every 30 seconds
      staleTime: 0,
      gcTime: 5 * 60 * 1000
    }
  });

  // Accept invitation mutation
  const { mutate: acceptInvitation } = useOrganizationsControllerAcceptInvitation({
    mutation: {
      onSuccess: async () => {
        setAcceptingInvitation(null);
        toast.success('Invitation accepted successfully!');

        // Invalidate and refetch organizations
        await queryClient.invalidateQueries({
          queryKey: ['/organizations']
        });

        // Refetch invitations to update the list
        await refetch();
      },
      onError: (error) => {
        setAcceptingInvitation(null);
        console.error('Error accepting invitation:', error);
        toast.error('Failed to accept invitation. Please try again.');
      }
    }
  });

  const handleAcceptInvitation = (invitationId: string): void => {
    setAcceptingInvitation(invitationId);

    const acceptData: AcceptInvitationDto = {
      invitation_id: invitationId
    };

    acceptInvitation({ data: acceptData });
  };

  const hasInvitations = invitations && Array.isArray(invitations) && invitations.length > 0;

  return {
    invitations,
    isLoading,
    hasInvitations,
    acceptingInvitation,
    handleAcceptInvitation,
    refetch
  };
};
