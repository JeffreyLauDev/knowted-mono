
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

export const useRawCalendars = () => {
  return useCallback(async (): Promise<CalendarListResponse[]> => {
        const { data, error } = await supabase.functions.invoke('knowted-api-gateway', {
      body: { 
        path: 'calendars-raw',
        limit: 10
      }
    });

    if (error) {
      console.error('Error calling calendar API:', error);
      throw error;
    }

    return data;
  }, []);
};


export interface CalendarListResponse {
  calendars: CalendarListEntry[];
}
export interface CalendarListEntry {
  email: string;
  id: string;
  is_primary: boolean;
}
 