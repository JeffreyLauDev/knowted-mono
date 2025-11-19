import { useCalendarControllerGetCalendarSyncStatus } from '@/api/generated/knowtedAPI';
import type { CalendarSyncStatusDto } from '@/api/generated/models/calendarSyncStatusDto';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/lib/toast';
import { Calendar, X } from 'lucide-react';
import React, { useEffect } from 'react';
import CalendarConnectionButtons from './CalendarConnectionButtons';

interface CalendarSyncRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CalendarSyncRecommendationModal: React.FC<CalendarSyncRecommendationModalProps> = ({
  isOpen,
  onClose
}) => {
  const { organization } = useAuth();

  // Debug logging
  console.warn('🎯 CalendarSyncRecommendationModal render:', { isOpen, organizationId: organization?.id });

  // Get calendar sync status to check if user has already connected calendars
  const { data: syncStatusResponse, refetch: refetchSyncStatus } = useCalendarControllerGetCalendarSyncStatus(
    { organizationId: organization?.id || '' },
    {
      query: {
        enabled: !!organization?.id && isOpen,
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true
      }
    }
  );

  // Extract the actual sync status data from the response
  const syncStatus = (syncStatusResponse && 'data' in syncStatusResponse ? syncStatusResponse.data : syncStatusResponse) as CalendarSyncStatusDto | undefined;

  // Check if user has any calendar connected
  const hasAnyCalendarConnected = syncStatus && (syncStatus.has_google_oauth || syncStatus.has_microsoft_oauth);

  // Handle calendar connection success
  const handleCalendarConnected = async (): Promise<void> => {
    // Refresh sync status to check if we can close the modal
    await refetchSyncStatus();
  };

  // Auto-close modal when calendar is connected
  useEffect(() => {
    if (hasAnyCalendarConnected && isOpen) {
      // Small delay to show success message before closing
      const timer = setTimeout(() => {
        onClose();
        toast.success(
          'Great! Your calendar is now connected. ' +
          'You can manage your calendar settings anytime from the dashboard.'
        );
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [hasAnyCalendarConnected, isOpen, onClose]);

    return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[600px]"
        onPointerDownOutside={onClose}
        onEscapeKeyDown={onClose}
      >
        <DialogHeader className="relative">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Connect Your Calendar
          </DialogTitle>
          <DialogDescription>
            To get the most out of Knowted, we recommend connecting your calendar to automatically sync your meetings and events.
            <br />
            <span className="font-medium text-foreground mt-2 block">
              You can close this modal and connect your calendar later from the dashboard.
            </span>
          </DialogDescription>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-0 right-0 p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Connecting your calendar will allow us to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Automatically sync your meetings and events</li>
              <li>Provide better meeting insights and analytics</li>
              <li>Help you stay organized across all your tools</li>
            </ul>
          </div>

          <CalendarConnectionButtons
            onCalendarConnected={handleCalendarConnected}
            variant="modal"
          />

          <div className="text-center text-sm text-muted-foreground">
            <p>You can skip this step and connect your calendar later from the dashboard settings.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CalendarSyncRecommendationModal;
