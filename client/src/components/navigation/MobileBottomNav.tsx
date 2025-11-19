import { useMeetingTypesControllerFindAll } from '@/api/generated/knowtedAPI';
import MeetingCaptureDialog from '@/components/dashboard/MeetingCaptureDialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Calendar, MessageCircle, Mic, Radio, Settings } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const MobileBottomNav = (): JSX.Element | null => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { organization } = useAuth();
  const [isCaptureDialogOpen, setIsCaptureDialogOpen] = useState(false);

  // Check if we're on the chat/dashboard page
  const isOnChatPage = location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/sessions/');

  const { data: meetingTypesResponse } = useMeetingTypesControllerFindAll(
    { organization_id: organization?.id || '' },
    {
      query: {
        enabled: !!organization?.id
      }
    }
  );

  const meetingTypes = Array.isArray(meetingTypesResponse)
    ? meetingTypesResponse
    : (meetingTypesResponse && 'data' in meetingTypesResponse && Array.isArray(meetingTypesResponse.data))
      ? meetingTypesResponse.data
      : [];

  // Only show on mobile
  if (!isMobile) {
    return null;
  }

  const handleVoiceRecord = (): void => {
    setIsCaptureDialogOpen(true);
  };

  const handleViewMeetings = (): void => {
    navigate('/dashboard/meetings-list');
  };

  const handleAddToLive = (): void => {
    setIsCaptureDialogOpen(true);
  };

  const handleSettings = (): void => {
    navigate('/organization/details');
  };

  const handleChat = (): void => {
    navigate('/dashboard');
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border md:hidden safe-area-inset-bottom shadow-lg">
        <div className="flex items-center justify-around h-16 relative">
          {/* Chat */}
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center justify-center gap-0.5 h-full flex-1 rounded-none hover:bg-accent/50 ${
              isOnChatPage ? 'bg-accent/30' : ''
            }`}
            onClick={handleChat}
          >
            <MessageCircle className="h-8 w-8" />
            <span className="text-[10px] font-normal">Chat</span>
          </Button>

          {/* View Other Meetings */}
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center justify-center gap-0.5 h-full flex-1 rounded-none hover:bg-accent/50 ${
              location.pathname === '/dashboard/meetings-list' ? 'bg-accent/30' : ''
            }`}
            onClick={handleViewMeetings}
          >
            <Calendar className="h-8 w-8" />
            <span className="text-[10px] font-normal">View Meetings</span>
          </Button>

          {/* Spacer for floating button */}
          <div className="flex-1"></div>

          {/* Add to Live */}
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center justify-center gap-0.5 h-full flex-1 rounded-none hover:bg-accent/50"
            onClick={handleAddToLive}
          >
            <Radio className="h-8 w-8" />
            <span className="text-[10px] font-normal">Add to Meeting</span>
          </Button>

          {/* Settings */}
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center justify-center gap-0.5 h-full flex-1 rounded-none hover:bg-accent/50 ${
              location.pathname.startsWith('/organization') ? 'bg-accent/30' : ''
            }`}
            onClick={handleSettings}
          >
            <Settings className="h-8 w-8" />
            <span className="text-[10px] font-normal">Settings</span>
          </Button>
        </div>

        {/* Voice Record - Floating Round Button in Middle */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-4">
          {/* Gentle pulsing ring animation */}
          <div className="absolute inset-0 rounded-full bg-primary/20" style={{ animation: 'gentle-pulse 3s ease-in-out infinite' }}></div>

          <Button
            variant="default"
            size="icon"
            className="relative h-16 w-16 rounded-full bg-primary hover:bg-primary/90 shadow-2xl hover:shadow-3xl transition-all duration-200 hover:scale-110 active:scale-95 border-4 border-background"
            style={{ animation: 'gentle-breathe 3s ease-in-out infinite' }}
            onClick={handleVoiceRecord}
          >
            <Mic className="h-8 w-8 text-primary-foreground" />
          </Button>
        </div>

        <style>{`
          @keyframes gentle-pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 0.2;
            }
            50% {
              transform: scale(1.15);
              opacity: 0.1;
            }
          }
          @keyframes gentle-breathe {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
          }
        `}</style>
      </nav>

      {/* Meeting Capture Dialog */}
      {organization && meetingTypes.length > 0 && (
        <MeetingCaptureDialog
          isOpen={isCaptureDialogOpen}
          onClose={() => setIsCaptureDialogOpen(false)}
          organizationId={organization.id}
          meetingTypes={meetingTypes}
        />
      )}
    </>
  );
};

export default MobileBottomNav;

