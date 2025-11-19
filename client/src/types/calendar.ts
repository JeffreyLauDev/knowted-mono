
export interface Calendar {
  email: string;
  google_id: string;
  name: string;
  resource_id?: string | null;
  uuid: string;
}

export interface Event {
  uuid: string;
  google_id: string;
  name: string;
  meeting_url?: string;
  start_time: string;
  end_time: string;
  is_organizer: boolean;
  recurring_event_id?: string;
  is_recurring: boolean;
  calendar_uuid: string;
  attendees?: Array<{email: string; name: string}>;
  last_updated_at: string;
  deleted: boolean;
  bot_param?: any;
  raw?: any;
}

export interface CreateCalendarParams {
  calendarId: string;
  name: string;
  email?: string;
}

export interface ListEventsParams {
  calendarId: string;
  startTime?: string;
  endTime?: string;
}

export interface GetEventParams {
  calendarId: string;
  eventId: string;
}
