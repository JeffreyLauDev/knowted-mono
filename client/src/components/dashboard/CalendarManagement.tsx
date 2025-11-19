import {
    useCalendarOAuthControllerGetCalendarSyncStatus,
    useCalendarsControllerFindMyCalendars,
    useCalendarsControllerRefreshCalendars,
    useCalendarsControllerSyncSpecificCalendar,
    useCalendarsControllerUnsyncSpecificCalendar
} from '@/api/generated/knowtedAPI';
import type { CalendarSyncStatusDto } from '@/api/generated/models/calendarSyncStatusDto';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/lib/toast';
import { Calendar as CalendarIcon, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CalendarData {
  uuid: string;
  name: string;
  email: string;
  google_id: string;
  isSynced: boolean;
  isPrimary?: boolean;
  provider?: 'google' | 'microsoft';
}

export const CalendarManagement = (): JSX.Element => {
  const [calendars, setCalendars] = useState<CalendarData[]>([]);
  const { user, organization } = useAuth();

  // Use the orval-generated hook to fetch calendars with organization ID
  const { data, isLoading, refetch } = useCalendarsControllerFindMyCalendars(
    undefined, // params
    {
      query: {
        enabled: !!user && !!organization?.id
      }
    }
  );

  // Get calendar sync status for Google and Microsoft
  const { data: syncStatusResponse } = useCalendarOAuthControllerGetCalendarSyncStatus(
    { organizationId: organization?.id || '' },
    {
      query: {
        enabled: !!organization?.id
      }
    }
  );

  // Extract the actual sync status data from the response
  const syncStatus = (syncStatusResponse && 'data' in syncStatusResponse ? syncStatusResponse.data : syncStatusResponse) as CalendarSyncStatusDto | undefined;

  // Sync calendar mutation
  const syncCalendar = useCalendarsControllerSyncSpecificCalendar({
    mutation: {
      onSuccess: (response) => {
        const data = 'data' in response ? response.data : response;
        if (data.success) {
          toast.success(`Calendar "${data.calendarName}" synced successfully`);
          refetch(); // Refresh the calendar list
        } else {
          toast.error(data.message || 'Failed to sync calendar');
        }
      },
      onError: () => {
        toast.error('Failed to sync calendar');
      }
    }
  });

  // Unsync calendar mutation
  const unsyncCalendar = useCalendarsControllerUnsyncSpecificCalendar({
    mutation: {
      onSuccess: (response) => {
        const data = 'data' in response ? response.data : response;
        if (data.success) {
          toast.success(`Calendar "${data.calendarName}" unsynced successfully`);
          refetch(); // Refresh the calendar list
        } else {
          toast.error(data.message || 'Failed to unsync calendar');
        }
      },
      onError: () => {
        toast.error('Failed to unsync calendar');
      }
    }
  });

  // Refresh calendars mutation
  const refreshCalendarsByOrganization = useCalendarsControllerRefreshCalendars({
    mutation: {
      onSuccess: (response) => {
        const data = 'data' in response ? response.data : response;
        if (data.success) {
          toast.success(`Refreshed calendars. ${data.syncedCalendars} calendars synced out of ${data.totalAvailable} available.`);
          refetch(); // Refresh the calendar list
        } else {
          toast.error(data.message || 'Failed to refresh calendars');
        }
      },
      onError: () => {
        toast.error('Failed to refresh calendars');
      }
    }
  });

  // Handle the API response and transform it to our CalendarData interface
  useEffect(() => {
    if (data) {
      // Transform the API response to match our CalendarData interface
      const transformedCalendars: CalendarData[] = Array.isArray(data) ? data.map((calendar) => ({
        uuid: calendar.id || calendar.uuid,
        name: calendar.name,
        email: calendar.email,
        google_id: calendar.google_id || '',
        isSynced: calendar.active || false,
        isPrimary: false, // You may need to determine this from the API response
        provider: calendar.provider as 'google' | 'microsoft'
      })) : [];

      setCalendars(transformedCalendars);
    }
  }, [data]);

  const handleToggleSync = async (calendar: CalendarData): Promise<void> => {
    if (!organization?.id) {
      toast.error('Organization ID is required');
      return;
    }

    if (!calendar.provider) {
      toast.error('Calendar provider is required');
      return;
    }

    const params = {
      organizationId: organization.id,
      provider: calendar.provider
    };

    if (calendar.isSynced) {
      // Unsync the calendar
      unsyncCalendar.mutate({ calendarId: calendar.uuid, params });
    } else {
      // Sync the calendar
      syncCalendar.mutate({ calendarId: calendar.uuid, params });
    }
  };

  const handleRefreshCalendars = (): void => {
    if (!organization?.id) {
      toast.error('Organization ID is required');
      return;
    }

    // For now, we'll use 'google' as the default provider
    // You might want to add a provider selector or handle multiple providers
    refreshCalendarsByOrganization.mutate({
      params: {
        organizationId: organization.id,
        provider: 'google'
      }
    });
  };

  const formatDate = (date: string | null | undefined): string => {
    if (!date) return 'Never';
    try {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return 'Invalid date';
      }
      return parsedDate.toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading calendars...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendar Management
          </CardTitle>
          <Button
            onClick={handleRefreshCalendars}
            disabled={refreshCalendarsByOrganization.isPending}
            variant="outline"
            size="sm"
          >
            {refreshCalendarsByOrganization.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Calendar Sync Status */}
        {syncStatus && (
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-3">Calendar Provider Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${syncStatus.has_google_oauth ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm">Google Calendar</span>
                <span className="text-xs text-muted-foreground">
                  {syncStatus.has_google_oauth ? 'Connected' : 'Not connected'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${syncStatus.has_microsoft_oauth ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm">Microsoft Calendar</span>
                <span className="text-xs text-muted-foreground">
                  {syncStatus.has_microsoft_oauth ? 'Connected' : 'Not connected'}
                </span>
              </div>
            </div>
            {(syncStatus.google_calendar_synced || syncStatus.microsoft_calendar_synced) && (
              <div className="mt-3 pt-3 border-t">
                <h4 className="text-sm font-medium mb-2">Sync Status</h4>
                <div className="grid grid-cols-2 gap-4">
                  {syncStatus.google_calendar_synced && (
                    <div className="text-xs">
                      <span className="text-green-600">✓ Google synced</span>
                      {syncStatus.google_calendar_synced_at && (
                        <div className="text-muted-foreground">
                          Last sync: {formatDate(syncStatus.google_calendar_synced_at)}
                        </div>
                      )}
                    </div>
                  )}
                  {syncStatus.microsoft_calendar_synced && (
                    <div className="text-xs">
                      <span className="text-green-600">✓ Microsoft synced</span>
                      {syncStatus.microsoft_calendar_synced_at && (
                        <div className="text-muted-foreground">
                          Last sync: {formatDate(syncStatus.microsoft_calendar_synced_at)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {calendars.length === 0 ? (
          <p className="text-muted-foreground">No calendars found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Calendar Name</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Sync</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calendars.map((calendar) => (
                <TableRow key={calendar.uuid}>
                  <TableCell className="font-medium">
                    {calendar.name}
                    {calendar.isPrimary && (
                      <span className="ml-2 inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                        Primary
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">{calendar.provider || 'Unknown'}</span>
                  </TableCell>
                  <TableCell>
                    {calendar.isSynced ? (
                      <span className="text-green-600">Synced</span>
                    ) : (
                      <span className="text-gray-500">Not synced</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={calendar.isSynced}
                      onCheckedChange={() => handleToggleSync(calendar)}
                      disabled={syncCalendar.isPending || unsyncCalendar.isPending}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
