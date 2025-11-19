import { useOrganizationsControllerBulkInviteUsers, useTeamsControllerFindAll } from '@/api/generated/knowtedAPI';
import type { BulkInviteUsersDto } from '@/api/generated/models';
import { BulkEmailInput } from '@/components/shared/BulkEmailInput';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Plus } from 'lucide-react';
import React, { useState } from 'react';

interface BulkInviteResponse {
  message: string;
  total_processed: number;
  successful: number;
  failed: number;
  results: {
    email: string;
    success: boolean;
    invitation_id?: string;
    error?: string;
  }[];
}

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserInvited?: () => void;
  currentSeats?: number;
  seatLimit?: number;
  availableSeats?: number;
  isAtSeatLimit?: boolean;
}

export const AddMemberDialog = ({
  open,
  onOpenChange,
  onUserInvited,
  currentSeats,
  seatLimit,
  availableSeats,
  isAtSeatLimit
}: AddMemberDialogProps): JSX.Element => {
  const { toast } = useToast();
  const { organization } = useAuth();
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [bulkEmails, setBulkEmails] = useState<string[]>([]);
  const [currentEmailInput, setCurrentEmailInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    total: number;
    completed: number;
    failed: number;
    current: string;
  } | null>(null);

  // Get teams for the organization
  const { data: teamsData, isLoading: teamsLoading } = useTeamsControllerFindAll(
    { organization_id: organization?.id || '' },
    {
      query: {
        enabled: !!organization?.id && open
      }
    }
  );

  const teams = Array.isArray(teamsData) ? teamsData : [];

  // Set default team when teams are loaded
  React.useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  // Bulk invite users mutation
  const { mutate: bulkInviteUsers } = useOrganizationsControllerBulkInviteUsers({
    mutation: {
      onSuccess: (data) => {
        // Type assertion since the generated types show void but backend returns response
        const response = data as unknown as BulkInviteResponse;

        // Reset submitting state and progress
        setIsSubmitting(false);
        setBulkProgress(null);

        if (response.failed === 0) {
          toast({
            title: 'Success',
            description: `Successfully invited ${response.successful} users`
          });
          // Only close dialog on complete success
          handleClose();
          onUserInvited?.();
        } else if (response.successful === 0) {
          toast({
            title: 'Error',
            description: 'Failed to invite any users. Please try again.',
            variant: 'destructive'
          });
          // Don't close dialog on complete failure - let user retry
        } else {
          toast({
            title: 'Partial Success',
            description: `Invited ${response.successful} users, ${response.failed} failed`,
            variant: 'destructive'
          });
          // Don't close dialog on partial success - let user see results and potentially retry
        }
      },
      onError: (error) => {
        console.error('Error inviting users:', error);
        // Reset submitting state and progress
        setIsSubmitting(false);
        setBulkProgress(null);

        toast({
          title: 'Error',
          description: 'Failed to invite users. Please try again.',
          variant: 'destructive'
        });
        // Don't close dialog on error - let user retry
      }
    }
  });

  const validateEmail = (email: string): string | null => {
    const trimmed = email.trim();
    if (!trimmed?.includes('@')) {
      return null;
    }

    // Extract email from "First Last <email@example.com>" format
    const emailInBrackets = /<(.+@.+)>/.exec(trimmed);
    if (emailInBrackets) {
      return emailInBrackets[1];
    }

    // Check for comma-separated format
    const parts = trimmed.split(',').map((p) => p.trim());
    if (parts.length >= 2) {
      // Check if first part is email
      if (parts[0].includes('@')) {
        return parts[0];
      } else {
        // First part is name, second part is email
        return parts[1];
      }
    }

    // Just email
    return trimmed;
  };

  const handleBulkInvite = async (): Promise<void> => {
    if (!organization?.id) {
      toast({
        title: 'Error',
        description: 'No organization selected',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedTeamId) {
      toast({
        title: 'Error',
        description: 'Please select a team for the users.',
        variant: 'destructive'
      });
      return;
    }

    // Auto-add current email input if it exists and no emails are in the list
    let emailsToProcess = [...bulkEmails];
    if (currentEmailInput.trim() && bulkEmails.length === 0) {
      const emailAddress = validateEmail(currentEmailInput.trim());
      if (emailAddress) {
        emailsToProcess = [emailAddress];
        setBulkEmails([emailAddress]);
        setCurrentEmailInput('');
      } else {
        toast({
          title: 'Invalid email',
          description: 'Please enter a valid email address.',
          variant: 'destructive'
        });
        return;
      }
    }

    if (emailsToProcess.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one email address.',
        variant: 'destructive'
      });
      return;
    }

    // Check seat limit
    if (isAtSeatLimit) {
      toast({
        title: 'Seat Limit Reached',
        description: 'You have reached your seat limit. Please upgrade your plan to invite more users.',
        variant: 'destructive'
      });
      return;
    }

    if (availableSeats !== undefined && emailsToProcess.length > availableSeats) {
      toast({
        title: 'Too Many Invitations',
        description: `You can only invite ${availableSeats} more user${availableSeats !== 1 ? 's' : ''}. Please upgrade your plan or reduce the number of invitations.`,
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    setBulkProgress({
      total: emailsToProcess.length,
      completed: 0,
      failed: 0,
      current: 'Processing...'
    });

    // Validate and prepare users data
    const users = emailsToProcess
      .map((email) => {
        const emailAddress = validateEmail(email);
        return emailAddress ? { email: emailAddress, team_id: selectedTeamId } : null;
      })
      .filter(Boolean);

    if (users.length === 0) {
      toast({
        title: 'Error',
        description: 'No valid email addresses found.',
        variant: 'destructive'
      });
      setIsSubmitting(false);
      setBulkProgress(null);
      return;
    }

    // Use the bulk invite API
    const bulkInviteData: BulkInviteUsersDto = {
      users: users
    };

    bulkInviteUsers({
      organizationId: organization.id,
      data: bulkInviteData
    });

    // Don't reset state here - let the API response handlers manage it
    // The dialog will only close on success via onSuccess callback
  };

  const handleClose = (): void => {
    // Reset to first available team instead of empty string
    setSelectedTeamId(teams.length > 0 ? teams[0].id : '');
    setBulkEmails([]);
    setCurrentEmailInput('');
    setIsSubmitting(false);
    setBulkProgress(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] ">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            Bulk Invite Members
          </DialogTitle>
          <DialogDescription>
            Send invitations to multiple users at once. Users will receive emails with instructions.
            {seatLimit !== undefined && currentSeats !== undefined && (
              <div className="mt-2 p-3 bg-muted/50 rounded-md">
                <div className="flex items-center justify-between text-sm">
                  <span>Seat Usage: {currentSeats} / {seatLimit}</span>
                  <span className={isAtSeatLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                    {availableSeats} available
                  </span>
                </div>
                {isAtSeatLimit && (
                  <p className="text-xs text-destructive mt-1">
                    ⚠️ You have reached your seat limit. Please upgrade your plan to invite more users.
                  </p>
                )}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bulk-emails">Email Addresses *</Label>
            <BulkEmailInput
              emails={bulkEmails}
              onEmailsChange={setBulkEmails}
              currentEmailInput={currentEmailInput}
              onCurrentEmailInputChange={setCurrentEmailInput}
              placeholder="Type email and press Enter to add"
              disabled={isSubmitting}
              availableSeats={availableSeats}
              isAtSeatLimit={isAtSeatLimit}
            />
            <p className="text-xs text-muted-foreground">
              Type an email and press Enter to add it. You can also paste a list of emails
              (one per line) to bulk import them.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-team">Team *</Label>
            <Select
              value={selectedTeamId}
              onValueChange={setSelectedTeamId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a team for all users" />
              </SelectTrigger>
              <SelectContent>
                {teamsLoading ? (
                  <SelectItem value="" disabled>
                    Loading teams...
                  </SelectItem>
                ) : teams.length === 0 ? (
                  <SelectItem value="" disabled>
                    No teams available
                  </SelectItem>
                ) : (
                  teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A team must be selected for all invited users.
            </p>
          </div>

          {/* Seat Limit Warning */}
          {isAtSeatLimit && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-center gap-2 text-destructive">
                <span className="text-sm font-medium">⚠️ Seat Limit Reached</span>
              </div>
              <p className="text-xs text-destructive mt-1">
                You have reached your seat limit ({currentSeats}/{seatLimit}).
                Please upgrade your plan to invite more users.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-xs h-7 px-3"
                onClick={() => {
                  // TODO: Navigate to billing/upgrade page
                  window.open('/dashboard/billing', '_blank');
                }}
              >
                Upgrade Plan
              </Button>
            </div>
          )}

          {/* Seat Limit Warning - Close to Limit */}
          {!isAtSeatLimit && availableSeats !== undefined && availableSeats <= 2 && availableSeats > 0 && (
            <div className="p-3 bg-warning/10 border border-warning/20 rounded-md">
              <div className="flex items-center gap-2 text-warning-foreground">
                <span className="text-sm font-medium">⚠️ Almost at Seat Limit</span>
              </div>
              <p className="text-xs text-warning-foreground mt-1">
                You only have {availableSeats} seat{availableSeats !== 1 ? 's' : ''} remaining.
                Consider upgrading your plan for more seats.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-xs h-7 px-3"
                onClick={() => {
                  // TODO: Navigate to billing/upgrade page
                  window.open('/organization/billing', '_blank');
                }}
              >
                View Plans
              </Button>
            </div>
          )}

          {bulkProgress && (
            <div className="space-y-2 p-3 bg-muted rounded-md">
              <div className="flex justify-between text-sm">
                <span>Processing: {bulkProgress.total} users</span>
              </div>
              <div className="w-full bg-background rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300 animate-pulse"
                  style={{ width: '100%' }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {bulkProgress.current}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleBulkInvite}
              disabled={isSubmitting || !selectedTeamId || isAtSeatLimit}
              title={isAtSeatLimit ? 'You have reached your seat limit. Please upgrade your plan to invite more users.' : undefined}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inviting {bulkEmails.length} users...
                </>
              ) : isAtSeatLimit ? (
                'Seat Limit Reached'
              ) : !selectedTeamId ? (
                'Select Team First'
              ) : bulkEmails.length === 0 ? (
                'Invite Users'
              ) : (
                `Invite ${bulkEmails.length} Users`
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
