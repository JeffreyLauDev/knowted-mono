
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

export const useDeleteCalendar = () => {
  return useCallback(async (params: { calendarId: string }): Promise<void> => {
        const { error } = await supabase.functions.invoke('knowted-api-gateway', {
      body: { 
        path: 'calendars-delete',
        ...params
      }
    });

    if (error) {
      console.error('Error calling calendar API:', error);
      throw error;
    }
  }, []);
};
