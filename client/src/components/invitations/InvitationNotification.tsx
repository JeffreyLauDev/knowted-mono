import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useInvitations } from '@/hooks/useInvitations';
import { Bell } from 'lucide-react';

interface InvitationNotificationProps {
  onViewInvitations: () => void;
}

const InvitationNotification = ({ onViewInvitations }: InvitationNotificationProps): JSX.Element | null => {
  const { hasInvitations, isLoading } = useInvitations();

  if (isLoading || !hasInvitations) {
    return null;
  }
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onViewInvitations}
      className="relative hover:bg-white/20 text-sidebar-foreground w-full bg-white/10 text-sidebar-foreground border-white/20 hover:bg-white/20 hover:text-white"
    >
      <Bell className="h-4 w-4 mr-2" />
      <span>Invitations</span>
      <Badge
        variant="destructive"
        className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
      >
        !
      </Badge>
    </Button>
  );
};

export default InvitationNotification;
