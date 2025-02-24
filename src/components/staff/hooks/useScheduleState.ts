
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Employee {
  id: string;
  name: string;
}

export const useScheduleState = (employee: Employee) => {
  const [scheduleType, setScheduleType] = useState("1");
  const [currentWeek, setCurrentWeek] = useState(0);
  const [weekConfigs] = useState(Array(4).fill(null));

  const handleSubmit = async () => {
    try {
      await supabase
        .from('schedules')
        .delete()
        .eq('employee_id', employee.id);

      return true;
    } catch (error) {
      console.error('Error submitting schedule:', error);
      return false;
    }
  };

  return {
    scheduleType,
    setScheduleType,
    currentWeek,
    weekConfigs,
    handleSubmit
  };
};
