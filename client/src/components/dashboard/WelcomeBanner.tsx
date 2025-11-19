import { useCalendarControllerGetCalendarSyncStatus } from '@/api/generated/knowtedAPI';
import type { CalendarSyncStatusDto } from '@/api/generated/models/calendarSyncStatusDto';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Calendar, X } from 'lucide-react';
import React, { useState } from 'react';
import CalendarIntegrationModal from './CalendarIntegrationModal';

interface WelcomeBannerProps {
  onDismiss?: () => void;
}

const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  onDismiss
}) => {
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const { organization } = useAuth();

  // Check calendar sync status to see if any calendar is connected
  const { data: syncStatusResponse } = useCalendarControllerGetCalendarSyncStatus(
    { organizationId: organization?.id || '' },
    {
      query: {
        enabled: !!organization?.id,
        refetchInterval: 10000 // Check every 10 seconds
      }
    }
  );

  // Extract sync status data
  const syncStatus = syncStatusResponse && 'data' in syncStatusResponse
    ? syncStatusResponse.data
    : syncStatusResponse as CalendarSyncStatusDto | undefined;

  // Check if any calendar is connected
  const hasCalendarConnected = syncStatus && (
    syncStatus.has_google_oauth ||
    syncStatus.has_microsoft_oauth
  );

  // Don't show banner if calendar is connected
  if (hasCalendarConnected) {
    return null;
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 relative shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pro Tips</h3>
            <p className="text-sm text-gray-600 mb-4">
              Get started by connecting your calendar to automatically sync your meetings and events.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setIsCalendarModalOpen(true)}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-white border-primary"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Connect Calendar
              </Button>
            </div>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <CalendarIntegrationModal
        isOpen={isCalendarModalOpen}
        onOpenChange={setIsCalendarModalOpen}
      />
    </>
  );
};

export default WelcomeBanner;
