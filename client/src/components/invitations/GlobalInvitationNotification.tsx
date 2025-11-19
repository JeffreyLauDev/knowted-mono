import { useInvitationContext } from '@/components/invitations/InvitationProvider';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast as sonnerToast } from 'sonner';
import InvitationDialog from './InvitationDialog';

const GlobalInvitationNotification = (): JSX.Element | null => {
  const { hasInvitations, isLoading } = useInvitationContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasShownNotification, setHasShownNotification] = useState(false);

  useEffect(() => {
    // Show notification toast when invitations are available and we haven't shown it yet
    if (hasInvitations && !isLoading && !hasShownNotification) {
      sonnerToast.info(
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>You have pending organization invitations</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setIsDialogOpen(true);
                setHasShownNotification(true);
              }}
            >
              View
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setHasShownNotification(true)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>,
        {
          duration: 10000, // 10 seconds
          id: 'invitation-notification' // Prevent duplicate toasts
        }
      );
      setHasShownNotification(true);
    }
  }, [hasInvitations, isLoading, hasShownNotification]);

  // Reset notification state when invitations change
  useEffect(() => {
    if (!hasInvitations) {
      setHasShownNotification(false);
    }
  }, [hasInvitations]);

  return (
    <InvitationDialog
      isOpen={isDialogOpen}
      onClose={() => setIsDialogOpen(false)}
    />
  );
};

export default GlobalInvitationNotification;
