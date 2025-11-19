
import { useCalendarEvents } from './calendar/useCalendarEvents';
import { useCreateCalendar } from './calendar/useCreateCalendar';
import { useDeleteCalendar } from './calendar/useDeleteCalendar';
import { useGetCalendar } from './calendar/useGetCalendar';
import { useRawCalendars } from './calendar/useRawCalendars';
import { useUpdateCalendar } from './calendar/useUpdateCalendar';

export type { Calendar, CreateCalendarParams, Event, GetEventParams, ListEventsParams } from '@/types/calendar';

export const useMeetingBaas = () => {
  const listRawCalendars = useRawCalendars();
  const createCalendar = useCreateCalendar();
  const deleteCalendar = useDeleteCalendar();
  const getCalendar = useGetCalendar();
  const updateCalendar = useUpdateCalendar();
  const { getEvent, listEvents } = useCalendarEvents();

  return {
    createCalendar,
    deleteCalendar,
    getCalendar,
    updateCalendar,
    getEvent,
    listEvents,
    listRawCalendars,
  };
};
