
import { supabase } from '@/integrations/supabase/client';
import { Calendar } from '@/types/calendar';
import { useCallback } from 'react';

export const useGetCalendar = () => {
  return useCallback(async (params: { calendarId: string }): Promise<Calendar> => {
        const { data, error } = await supabase.functions.invoke('knowted-api-gateway', {
      body: { 
        path: 'calendars-get',
        ...params
      }
    });

    if (error) {
      console.error('Error calling calendar API:', error);
      throw error;
    }

    return data;
  }, []);
};
