export type CalendarProvider = "google" | "microsoft";

export interface RawCalendar {
  id: string;
  name?: string;
  email?: string;
  resource_id?: string;
}

export interface MeetingBaasEvent {
  uuid: string;
  start_time: string;
  end_time: string;
  name: string;
  is_recurring?: boolean;
  meeting_url?: string;
  raw?: {
    organizer?: { email?: string };
    attendees?: { email: string }[];
  };
}

export interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface CalendarSyncStatus {
  google_calendar_synced: boolean;
  microsoft_calendar_synced: boolean;
  google_calendar_synced_at: string | null;
  microsoft_calendar_synced_at: string | null;
  has_google_oauth: boolean;
  has_microsoft_oauth: boolean;
}

export interface AvailableCalendar {
  id: string;
  name: string;
  email: string;
  googleId?: string;
  resourceId?: string;
  isSelected: boolean;
  isActive: boolean;
}

export interface CalendarSelectionResult {
  success: boolean;
  message: string;
}

export interface CalendarRefreshResult {
  success: boolean;
  message: string;
  syncedCalendars: number;
  totalAvailable: number;
}

export interface CalendarSyncResult {
  success: boolean;
  message: string;
  calendarId: string;
  calendarName: string;
}

export interface DisconnectCalendarResult {
  success: boolean;
  message: string;
}

export interface OAuthCallbackResult {
  success: boolean;
  message: string;
}
