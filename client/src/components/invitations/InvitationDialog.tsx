import { useOrganizationsControllerAcceptInvitation } from '@/api/generated/knowtedAPI';
import type { AcceptInvitationDto, InvitationResponseDto } from '@/api/generated/models';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { useInvitations } from '@/hooks/useInvitations';
import { toast } from '@/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, CheckCircle, Clock, User } from 'lucide-react';
import { useState } from 'react';

interface InvitationDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const InvitationDialog = ({ isOpen, onClose }: InvitationDialogProps): JSX.Element => {
  const { switchOrganization } = useAuth();
  const queryClient = useQueryClient();
  const { invitations, isLoading, refetch } = useInvitations();
  const [acceptingInvitationId, setAcceptingInvitationId] = useState<string | null>(null);

  // Accept invitation mutation
  const { mutate: acceptInvitation } = useOrganizationsControllerAcceptInvitation({
    mutation: {
      onSuccess: async (data) => {
        setAcceptingInvitationId(null);
        toast.success('Invitation accepted successfully!');

        // Invalidate and refetch organizations
        await queryClient.invalidateQueries({
          queryKey: ['/organizations']
        });

        // Switch to the accepted organization if data contains organization_id
        if (data && typeof data === 'object' && 'organization_id' in data) {
          try {
            await switchOrganization((data as { organization_id: string }).organization_id);
          } catch (error) {
            console.error('Error switching organization:', error);
          }
        }

        // Refetch invitations to update the list
        refetch();

        // Close dialog if no more invitations
        if (invitations && Array.isArray(invitations) && invitations.length <= 1) {
          onClose();
        }
      },
      onError: (error) => {
        setAcceptingInvitationId(null);
        console.error('Error accepting invitation:', error);
        toast.error('Failed to accept invitation. Please try again.');
      }
    }
  });

  const handleAcceptInvitation = (invitationId: string): void => {
    setAcceptingInvitationId(invitationId);

    const acceptData: AcceptInvitationDto = {
      invitation_id: invitationId
    };

    acceptInvitation({ data: acceptData });
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading invitations...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const invitationList = invitations && Array.isArray(invitations) ? invitations as InvitationResponseDto[] : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Invitations
          </DialogTitle>
          <DialogDescription>
            You have pending invitations to join organizations. Accept an invitation to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {invitationList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending invitations</p>
            </div>
          ) : (
            invitationList.map((invitation: InvitationResponseDto) => (
              <div
                key={invitation.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">
                      {invitation.organization?.name || 'Unknown Organization'}
                    </h4>
                    {invitation.organization?.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {invitation.organization.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {invitation.role || 'Member'}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>
                    Team: {invitation.team?.name || 'Unknown Team'}
                  </span>
                </div>

                {invitation.created_at && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Sent {formatDate(invitation.created_at)}</span>
                  </div>
                )}

                <Button
                  onClick={() => handleAcceptInvitation(invitation.id)}
                  disabled={acceptingInvitationId === invitation.id}
                  className="w-full"
                  size="sm"
                >
                  {acceptingInvitationId === invitation.id ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept Invitation
                    </>
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvitationDialog;
