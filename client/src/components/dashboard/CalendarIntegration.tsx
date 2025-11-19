import {
  calendarControllerGenerateOAuthUrl,
  useCalendarControllerDisconnectCalendar,
  useCalendarControllerGetCalendarSyncStatus,
  useCalendarControllerListMyCalendars,
  useCalendarControllerRefreshCalendarsByOrganization
} from '@/api/generated/knowtedAPI';
import type { CalendarSyncStatusDto } from '@/api/generated/models/calendarSyncStatusDto';
import { Button } from '@/components/ui/button';

import { useAuth } from '@/context/AuthContext';
import { toast } from '@/lib/toast';
import { Calendar, Loader2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface CalendarData {
  uuid: string;
  name: string;
  email: string;
  google_id: string;
  isSynced: boolean;
  isPrimary?: boolean;
  provider?: 'google' | 'microsoft';
}

interface CalendarTableData {
  id: string;
  name: string;
  email: string;
  active: boolean;
  calender_id: string;
  google_id: string | null;
  organization_id: string;
  resource_id: string;
}

const CalendarIntegration: React.FC = () => {
  const { user, organization } = useAuth();
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isConnectingMicrosoft, setIsConnectingMicrosoft] = useState(false);
  const [calendars, setCalendars] = useState<CalendarData[]>([]);
  const [calendarTableData, setCalendarTableData] = useState<CalendarTableData[]>([]);

  // Ref to track OAuth success state
  const oauthSuccessRef = useRef(false);
  const checkClosedIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get calendars from the main endpoint to determine connection status
  const {
    data: calendarsData,
    refetch: refetchCalendars
  } = useCalendarControllerListMyCalendars(
    {
      organizationId: organization?.id || '',
      provider: 'google' // Default to google, we'll need to handle both providers
    },
    {
      query: {
        enabled: !!organization?.id,
        staleTime: 0, // Never cache
        gcTime: 0, // Don't keep in cache
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true
      }
    }
  );

  // Get calendar sync status for OAuth connection status
  const { data: syncStatusResponse, refetch: refetchSyncStatus } = useCalendarControllerGetCalendarSyncStatus(
    { organizationId: organization?.id || '' },
    {
      query: {
        enabled: !!organization?.id
      }
    }
  );

  // Extract the actual sync status data from the response
  const syncStatus = (syncStatusResponse && 'data' in syncStatusResponse ? syncStatusResponse.data : syncStatusResponse) as CalendarSyncStatusDto | undefined;

  // Refresh calendars mutation
  const refreshCalendarsByOrganization = useCalendarControllerRefreshCalendarsByOrganization({
    mutation: {
      onSuccess: () => {
        toast.success('Calendars refreshed successfully');
        refetchCalendars(); // Refresh the calendar list
        refetchSyncStatus(); // Refresh OAuth connection status
      },
      onError: () => {
        toast.error('Failed to refresh calendars');
      }
    }
  });

  // Disconnect calendar mutation
  const disconnectCalendarMutation = useCalendarControllerDisconnectCalendar({
    mutation: {
      onSuccess: () => {
        toast.success('Calendar disconnected successfully');
        refetchCalendars();
        refetchSyncStatus(); // Refresh OAuth connection status
      },
      onError: () => {
        toast.error('Failed to disconnect calendar');
      }
    }
  });

  // Transform calendar data and determine connection status
  useEffect(() => {
    if (calendarsData) {
      const transformedCalendars: CalendarData[] = Array.isArray(calendarsData) ? calendarsData.map((calendar) => ({
        uuid: calendar.id || calendar.uuid,
        name: calendar.name,
        email: calendar.email,
        google_id: calendar.google_id || '',
        isSynced: calendar.isSynced || false,
        isPrimary: calendar.isPrimary || false,
        provider: calendar.provider || 'google'
      })) : [];

      setCalendars(transformedCalendars);

      // Transform data for the table
      const tableData: CalendarTableData[] = Array.isArray(calendarsData) ? calendarsData.map((calendar) => ({
        id: calendar.id || calendar.uuid,
        name: calendar.name,
        email: calendar.email,
        active: calendar.active || false,
        calender_id: calendar.calender_id || calendar.id || calendar.uuid,
        google_id: calendar.google_id,
        organization_id: calendar.organization_id,
        resource_id: calendar.resource_id
      })) : [];

      setCalendarTableData(tableData);
    }
  }, [calendarsData]);

  // Helper function to check if a provider has connected calendars
  const hasConnectedCalendars = (provider: 'google' | 'microsoft'): boolean => {
    // First check OAuth connection status from sync status API
    if (syncStatus) {
      if (provider === 'google') {
        return syncStatus.has_google_oauth;
      } else {
        return syncStatus.has_microsoft_oauth;
      }
    }

    // Fallback to checking if there are any calendars for this provider
    return calendars.some((cal) => cal.provider === provider);
  };

  // Cleanup function for OAuth flow
  const cleanupOAuthFlow = (): void => {
    if (checkClosedIntervalRef.current) {
      clearInterval(checkClosedIntervalRef.current);
      checkClosedIntervalRef.current = null;
    }
    oauthSuccessRef.current = false;
  };

  const initiateOAuthFlow = async (provider: 'google' | 'microsoft'): Promise<void> => {
    if (!organization || !user) {
      toast.error('Organization or user not found');
      return;
    }

    // Reset OAuth success state
    oauthSuccessRef.current = false;

    if (provider === 'google') {
      setIsConnectingGoogle(true);
      setIsConnectingMicrosoft(false);
    } else {
      setIsConnectingMicrosoft(true);
      setIsConnectingGoogle(false);
    }

    try {
      // Get OAuth URL from backend using the configuration
      const authUrl = await getOAuthUrl(provider, organization.id);

      if (!authUrl) {
        throw new Error('Failed to generate OAuth URL');
      }

      const width = 600;
      const height = 700;
      const left = window.innerWidth / 2 - width / 2;
      const top = window.innerHeight / 2 - height / 2;

      const oauthWindow = window.open(
        authUrl,
        `Connect ${provider} Calendar`,
        `width=${width},height=${height},top=${top},left=${left}`
      );

      if (!oauthWindow) {
        throw new Error(
          'Popup window was blocked. Please allow popups for this site.'
        );
      }

      const handleOAuthResponse = async (event: MessageEvent): Promise<void> => {
        try {
          const data = event.data;

          if (data && data.type === 'oauth-success') {
            oauthSuccessRef.current = true; // Mark OAuth as successful
            if (organization && user) {
              const { provider } = data;

              toast.success(
                `${
                  provider.charAt(0).toUpperCase() + provider.slice(1)
                } calendar connected successfully!`
              );

              // Refresh calendars to get updated connection state
              await refetchCalendars();
              await refetchSyncStatus(); // Refresh OAuth connection status

              setIsConnectingGoogle(false);
              setIsConnectingMicrosoft(false);
            }
          } else if (data && data.type === 'oauth-failed') {
            const { error } = data;
            toast.error(
              `Failed to connect calendar: ${error || 'Unknown error'}`
            );
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          toast.error(`Failed to connect calendar: ${errorMessage}`);
        } finally {
          window.removeEventListener('message', handleOAuthResponse);
          resetLoadingState(provider);
          cleanupOAuthFlow();
        }
      };

      window.addEventListener('message', handleOAuthResponse);

      // Store interval reference for cleanup
      checkClosedIntervalRef.current = setInterval(() => {
        if (oauthWindow?.closed) {
          // Clean up immediately
          cleanupOAuthFlow();
          window.removeEventListener('message', handleOAuthResponse);
          resetLoadingState(provider);

          // Only show the message if OAuth was not successful
          if (!oauthSuccessRef.current) {
            toast.info('OAuth popup was closed. If you completed the authorization, please check your calendar connections.');
          }
        }
      }, 500);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(
        `Failed to start ${provider} calendar connection: ${errorMessage}`
      );
      resetLoadingState(provider);
    }
  };

  const getOAuthUrl = async (provider: 'google' | 'microsoft', organizationId: string): Promise<string> => {
    try {
              const response = await calendarControllerGenerateOAuthUrl({
        organizationId,
        provider
      });

      const data = 'data' in response ? response.data : response;
      return data && typeof data === 'object' && 'url' in data ? (data as { url: string }).url : '';
    } catch (error) {
      console.error('Error generating OAuth URL:', error);
      throw error;
    }
  };

  const resetLoadingState = (provider: 'google' | 'microsoft'): void => {
    if (provider === 'google') {
      setIsConnectingGoogle(false);
    } else {
      setIsConnectingMicrosoft(false);
    }
  };

  const disconnectCalendar = async (provider: 'google' | 'microsoft'): Promise<void> => {
    if (!organization || !user) {return;}

    // Use the Orval mutation hook for proper query invalidation
    disconnectCalendarMutation.mutate({
      params: {
        organizationId: organization.id,
        provider
      }
    });
  };

  const handleRefreshCalendars = (provider: 'google' | 'microsoft'): void => {
    if (!organization?.id) {
      toast.error('Organization ID is required');
      return;
    }

    refreshCalendarsByOrganization.mutate({
      params: {
        organizationId: organization.id,
        provider
      }
    });
  };

  const renderConnectionStatus = (provider: 'google' | 'microsoft'): JSX.Element => {
    const isLoading = provider === 'google' ? isConnectingGoogle : isConnectingMicrosoft;

    if (isLoading) {
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Connecting...</span>
        </div>
      );
    }

  };

  return (
    <div className="space-y-8">
      {/* Calendar Integration Section */}
      <div>
        {/* Section Header */}
        <div className="py-6 px-4">
          <div className="flex flex-col space-y-1">
            <h2 className="text-2xl font-bold text-foreground">Calendar Integration</h2>
            <span className="text-sm text-muted-foreground">
              Connect your calendars to sync meetings and events
            </span>
          </div>
        </div>

        {/* Integration Cards */}
        <div className="pb-6">
          <div className="space-y-4">
            {/* Google Calendar */}
            <div className="transition-colors border-b border-border">
              {/* Desktop Layout */}
              <div className="hidden sm:grid grid-cols-12 gap-4 p-4 items-start">
                <div className="col-span-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-background border rounded-lg flex items-center justify-center">
                      <img src="/icons/google-icon.svg" alt="Google Calendar" className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">Google Calendar</div>
                      <div className="text-sm text-muted-foreground">Connect your Google Calendar account</div>
                    </div>
                  </div>
                </div>
                <div className="col-span-4">
                  <div className="flex items-center">
                    {renderConnectionStatus('google')}
                  </div>
                </div>
                <div className="col-span-4">
                  <div className="flex items-center justify-end space-x-2">
                    {hasConnectedCalendars('google') ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRefreshCalendars('google')}
                          disabled={refreshCalendarsByOrganization.isPending}
                          className="h-8 px-3 text-xs"
                        >
                          {refreshCalendarsByOrganization.isPending ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Refreshing...
                            </>
                          ) : (
                            'Refresh'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => disconnectCalendar('google')}
                          className="h-8 px-3 text-xs"
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => initiateOAuthFlow('google')}
                        disabled={isConnectingGoogle || isConnectingMicrosoft}
                        className="h-8 px-4 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile Layout */}
              <div className="sm:hidden p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="h-8 w-8 bg-background border rounded-lg flex items-center justify-center flex-shrink-0">
                      <img src="/icons/google-icon.svg" alt="Google Calendar" className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground truncate">Google Calendar</div>
                      <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        Connect your Google Calendar account
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 ml-3 flex-shrink-0">
                    {hasConnectedCalendars('google') ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRefreshCalendars('google')}
                          disabled={refreshCalendarsByOrganization.isPending}
                          className="h-9 w-9 p-0 hover:bg-accent"
                        >
                          {refreshCalendarsByOrganization.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <span className="text-xs">Refresh</span>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => disconnectCalendar('google')}
                          className="h-9 w-9 p-0 hover:bg-accent text-red-600 hover:text-red-700"
                        >
                          <span className="text-xs">Disconnect</span>
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => initiateOAuthFlow('google')}
                        disabled={isConnectingGoogle || isConnectingMicrosoft}
                        className="h-9 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Microsoft Calendar */}
            <div className="transition-colors">
              {/* Desktop Layout */}
              <div className="hidden sm:grid grid-cols-12 gap-4 p-4 items-start">
                <div className="col-span-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-background border rounded-lg flex items-center justify-center">
                      <img src="/icons/outlook-icon.svg" alt="Microsoft Calendar" className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">Microsoft Calendar</div>
                      <div className="text-sm text-muted-foreground">Connect your Microsoft Calendar account</div>
                    </div>
                  </div>
                </div>
                <div className="col-span-4">
                  <div className="flex items-center">
                    {renderConnectionStatus('microsoft')}
                  </div>
                </div>
                <div className="col-span-4">
                  <div className="flex items-center justify-end space-x-2">
                    {hasConnectedCalendars('microsoft') ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRefreshCalendars('microsoft')}
                          disabled={refreshCalendarsByOrganization.isPending}
                          className="h-8 px-3 text-xs"
                        >
                          {refreshCalendarsByOrganization.isPending ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Refreshing...
                            </>
                          ) : (
                            'Refresh'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => disconnectCalendar('microsoft')}
                          className="h-8 px-3 text-xs"
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => initiateOAuthFlow('microsoft')}
                        disabled={isConnectingGoogle || isConnectingMicrosoft}
                        className="h-8 px-4 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile Layout */}
              <div className="sm:hidden p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="h-8 w-8 bg-background border rounded-lg flex items-center justify-center flex-shrink-0">
                      <img src="/icons/outlook-icon.svg" alt="Microsoft Calendar" className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground truncate">Microsoft Calendar</div>
                      <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        Connect your Microsoft Calendar account
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 ml-3 flex-shrink-0">
                    {hasConnectedCalendars('microsoft') ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRefreshCalendars('microsoft')}
                          disabled={refreshCalendarsByOrganization.isPending}
                          className="h-9 w-9 p-0 hover:bg-accent"
                        >
                          {refreshCalendarsByOrganization.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <span className="text-xs">Refresh</span>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => disconnectCalendar('microsoft')}
                          className="h-9 w-9 p-0 hover:bg-accent text-red-600 hover:text-red-700"
                        >
                          <span className="text-xs">Disconnect</span>
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => initiateOAuthFlow('microsoft')}
                        disabled={isConnectingGoogle || isConnectingMicrosoft}
                        className="h-9 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Calendars Section */}
      {calendarTableData.length > 0 && (
        <div>
          {/* Section Header */}
          <div className="px-6 py-6">
            <div className="flex flex-col space-y-1">
              <h2 className="text-2xl font-bold text-foreground">Connected Calendars</h2>
              <span className="text-sm text-muted-foreground">
                {calendarTableData.length} calendar{calendarTableData.length !== 1 ? 's' : ''} connected
              </span>
            </div>
          </div>

          {/* Calendars Table */}
          <div className="overflow-hidden">
            {/* Desktop Table Layout */}
            <div className="hidden sm:block px-6">
              <div className="grid grid-cols-12 gap-4 py-4 text-sm font-medium text-muted-foreground border-b border-border">
                <div className="col-span-8">Calendar Name</div>
                <div className="col-span-4">Status</div>
              </div>

              {calendarTableData.map((calendar, index) => (
                <div key={calendar.id} className={`grid grid-cols-12 gap-4 py-4 items-center hover:bg-accent transition-colors ${index < calendarTableData.length - 1 ? 'border-b border-border' : ''}`}>
                  <div className="col-span-8">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{calendar.name}</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-4">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${calendar.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-sm text-muted-foreground">
                        {calendar.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile List Layout */}
            <div className="sm:hidden">
              {calendarTableData.map((calendar, index) => (
                <div key={calendar.id} className={`hover:bg-accent transition-colors ${index < calendarTableData.length - 1 ? 'border-b border-border' : ''}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <Calendar className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground truncate">{calendar.name}</div>
                          <div className="flex items-center mt-1">
                            <div className={`w-2 h-2 rounded-full mr-2 ${calendar.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span className="text-sm text-muted-foreground">
                              {calendar.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarIntegration;
