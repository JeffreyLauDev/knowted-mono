import { aiConversationSessionsControllerFindAll } from '@/api/generated/knowtedAPI';
import type { MeetingListResponseDto } from '@/api/generated/models';
import MeetingAIChat from '@/components/dashboard/MeetingAIChat';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { toast } from 'sonner';

interface DashboardAIChatProps {
  meetings: MeetingListResponseDto[];
  selectedMeetingId?: string;
  className?: string;
}

const DashboardAIChat = ({ meetings, selectedMeetingId, className }: DashboardAIChatProps): JSX.Element => {
  const { user, organization } = useAuth();

  useEffect(() => {
    if (!user || !organization) {return;}

    const loadSessions = async (): Promise<void> => {
      try {
        await aiConversationSessionsControllerFindAll({
          organization_id: organization.id
        });
        // Note: activeSessionId logic removed as it was unused
      } catch (error) {
        console.error('Failed to load chat sessions:', error);
        toast.error('Failed to load chat sessions');
      }
    };

    loadSessions();
  }, [user, organization]);

  return (
    <div
      className={cn(
        'transition-all duration-300',
        'rounded-xl overflow-hidden bg-background',
        'h-full',
        className
      )}
    >

      <MeetingAIChat
        meetings={meetings}
        selectedMeetingId={selectedMeetingId}
        className={className}
      />
    </div>
  );
};

export default DashboardAIChat;
