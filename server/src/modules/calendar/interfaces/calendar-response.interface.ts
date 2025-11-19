import { CalendarProvider } from "../entities/calendars.entity";

export interface CalendarWhereClause {
  organization_id: string;
  profile: { id: string };
  provider?: CalendarProvider;
}

export interface CalendarSyncDetail {
  calendarId: string;
  calendarName: string | null;
  provider: CalendarProvider;
  active: boolean | null;
  eventCount: number;
  lastSync: Date;
  error?: string;
}

export interface EventSyncStatusResponse {
  totalCalendars: number;
  activeCalendars: number;
  totalEvents: number;
  lastSyncTime: string | null;
  syncDetails: CalendarSyncDetail[];
}

export interface SyncCalendarEventsResponse {
  success: boolean;
  message: string;
  data?: unknown;
}
