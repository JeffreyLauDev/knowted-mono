
import { supabase } from '@/integrations/supabase/client';
import { Calendar, CreateCalendarParams } from '@/types/calendar';
import { useCallback } from 'react';

export const useCreateCalendar = () => {
  return useCallback(async (params: CreateCalendarParams): Promise<Calendar> => {
        const { data, error } = await supabase.functions.invoke('knowted-api-gateway', {
      body: { 
        path: 'calendars-create',
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
