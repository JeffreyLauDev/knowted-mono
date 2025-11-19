import {
    useCalendarsControllerFindMyCalendars,
    useCalendarsControllerRefreshCalendars,
    useCalendarsControllerSyncSpecificCalendar
} from '@/api/generated/knowtedAPI';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
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
import { Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CalendarSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: 'google' | 'microsoft';
  onSync: () => void;
}

interface CalendarData {
  uuid: string;
  name: string;
  email: string;
  google_id: string;
  isSynced: boolean;
  isPrimary?: boolean;
  provider?: 'google' | 'microsoft';
}

export const CalendarSelectorDialog = ({
  open,
  onOpenChange,
  provider,
  onSync
}: CalendarSelectorDialogProps): JSX.Element => {
  const { organization } = useAuth();
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [calendars, setCalendars] = useState<CalendarData[]>([]);

  // Get calendars from the main endpoint
  const {
    data: calendarsData,
    isLoading: isLoadingCalendars,
    refetch: refetchCalendars
  } = useCalendarsControllerFindMyCalendars(
    undefined, // params
    {
      query: {
        enabled: !!organization?.id && open,
        staleTime: 0, // Never cache
        gcTime: 0 // Don't keep in cache
      }
    }
  );

  // Sync calendar mutation
  const syncCalendar = useCalendarsControllerSyncSpecificCalendar({
    mutation: {
      onSuccess: (response) => {
        const data = 'data' in response ? response.data : response;
        if (data.success) {
          toast.success(`Calendar "${data.calendarName}" synced successfully`);
        } else {
          toast.error(data.message || 'Failed to sync calendar');
        }
      },
      onError: () => {
        toast.error('Failed to sync calendar');
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
          refetchCalendars(); // Refresh the calendar list
        } else {
          toast.error(data.message || 'Failed to refresh calendars');
        }
      },
      onError: () => {
        toast.error('Failed to refresh calendars');
      }
    }
  });

  // Transform calendar data
  useEffect((): void => {
    if (calendarsData) {
      const transformedCalendars: CalendarData[] = Array.isArray(calendarsData) ? calendarsData.map((calendar) => ({
        uuid: calendar.id || calendar.uuid,
        name: calendar.name,
        email: calendar.email,
        google_id: calendar.google_id || '',
        isSynced: calendar.active || false,
        isPrimary: false,
        provider: calendar.provider as 'google' | 'microsoft'
      })) : [];

      // Filter calendars by provider
      const filteredCalendars = transformedCalendars.filter((cal) => cal.provider === provider);
      setCalendars(filteredCalendars);
    }
  }, [calendarsData, provider]);

  // Reset selected calendars when dialog opens
  useEffect((): void => {
    if (open) {
      setSelectedCalendarIds([]);
      refetchCalendars();
    }
  }, [open, refetchCalendars]);

  const handleCalendarToggle = (calendarId: string): void => {
    setSelectedCalendarIds((prev) =>
      prev.includes(calendarId)
        ? prev.filter((id) => id !== calendarId)
        : [...prev, calendarId]
    );
  };

  const handleSelectAll = (): void => {
    const allCalendarIds = calendars.map((cal) => cal.uuid);
    setSelectedCalendarIds(allCalendarIds);
  };

  const handleDeselectAll = (): void => {
    setSelectedCalendarIds([]);
  };

  const handleSyncSelected = async (): Promise<void> => {
    if (selectedCalendarIds.length === 0) {
      toast.error('Please select at least one calendar');
      return;
    }

    if (!organization?.id) {
      toast.error('Organization ID is required');
      return;
    }

    setIsSyncing(true);

    try {
      // Sync each selected calendar
      for (const calendarId of selectedCalendarIds) {
        const calendar = calendars.find((cal) => cal.uuid === calendarId);
        if (calendar?.provider) {
          await syncCalendar.mutateAsync({
            calendarId: calendarId,
            params: {
              organizationId: organization.id,
              provider: calendar.provider
            }
          });
        }
      }

      toast.success('Selected calendars synced successfully');
      setIsSyncing(false);
      onSync();
      onOpenChange(false);
    } catch (error) {
      console.error('Error in sync process:', error);
      setIsSyncing(false);
    }
  };

  const handleSyncAll = async (): Promise<void> => {
    if (!organization?.id) {
      toast.error('Organization ID is required');
      return;
    }

    setIsSyncing(true);

    try {
      // Use the refresh endpoint to sync all calendars for the provider
      await refreshCalendarsByOrganization.mutateAsync({
        params: {
          organizationId: organization.id,
          provider: provider
        }
      });

      toast.success('All calendars synced successfully');
      setIsSyncing(false);
      onSync();
      onOpenChange(false);
    } catch (error) {
      console.error('Error syncing all calendars:', error);
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Calendars to Sync</DialogTitle>
          <DialogDescription>
            Choose which {provider} calendars you want to sync with your account
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={isLoadingCalendars || calendars.length === 0}
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeselectAll}
            disabled={isLoadingCalendars || selectedCalendarIds.length === 0}
          >
            Deselect All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchCalendars()}
            disabled={isLoadingCalendars}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingCalendars ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {isLoadingCalendars ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading calendars...</span>
          </div>
        ) : calendars.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            No {provider} calendars found. Please refresh to check for available calendars.
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedCalendarIds.length === calendars.length && calendars.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleSelectAll();
                        } else {
                          handleDeselectAll();
                        }
                      }}
                      disabled={isLoadingCalendars}
                    />
                  </TableHead>
                  <TableHead>Calendar Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calendars.map((calendar) => (
                  <TableRow key={calendar.uuid}>
                    <TableCell>
                      <Checkbox
                        checked={selectedCalendarIds.includes(calendar.uuid)}
                        onCheckedChange={() => handleCalendarToggle(calendar.uuid)}
                        disabled={isSyncing}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {calendar.name}
                      {calendar.isPrimary && (
                        <span className="ml-2 inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                          Primary
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{calendar.email}</TableCell>
                    <TableCell>
                      {calendar.isSynced ? (
                        <span className="text-green-600">Synced</span>
                      ) : (
                        <span className="text-gray-500">Not synced</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={handleSyncSelected}
            disabled={selectedCalendarIds.length === 0 || isSyncing}
            className="flex-1"
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Syncing Selected...
              </>
            ) : (
              `Sync Selected (${selectedCalendarIds.length})`
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleSyncAll}
            disabled={isSyncing || calendars.length === 0}
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Syncing All...
              </>
            ) : (
              'Sync All'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
