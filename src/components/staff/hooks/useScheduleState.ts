
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Employee {
  id: string;
  name: string;
}

export function useScheduleState(employee: Employee) {
  const [scheduleType, setScheduleType] = useState<string>("1");
  const [currentWeek, setCurrentWeek] = useState(0);
  
  // 4 weeks of default schedule configuration
  const [weekConfigs, setWeekConfigs] = useState(Array(4).fill(null).map(() => ({
    monday: { isWorking: false, startTime: "09:00", endTime: "17:00" },
    tuesday: { isWorking: false, startTime: "09:00", endTime: "17:00" },
    wednesday: { isWorking: false, startTime: "09:00", endTime: "17:00" },
    thursday: { isWorking: false, startTime: "09:00", endTime: "17:00" },
    friday: { isWorking: false, startTime: "09:00", endTime: "17:00" },
    saturday: { isWorking: false, startTime: "09:00", endTime: "17:00" },
    sunday: { isWorking: false, startTime: "09:00", endTime: "17:00" },
  })));

  const handleSubmit = async () => {
    try {
      // Delete existing schedule entries for this employee
      await supabase
        .from('employee_availability')
        .delete()
        .eq('employee_id', employee.id);

      // Map days to their numerical values
      const dayMapping: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6
      };

      // Insert new schedule entries
      for (const weekConfig of weekConfigs) {
        for (const [day, config] of Object.entries(weekConfig)) {
          if (config.isWorking) {
            await supabase.from('employee_availability').insert({
              employee_id: employee.id,
              day_of_week: dayMapping[day],
              start_time: config.startTime,
              end_time: config.endTime
            });
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error saving schedule:', error);
      return false;
    }
  };

  return {
    scheduleType,
    setScheduleType,
    currentWeek,
    setCurrentWeek,
    weekConfigs,
    setWeekConfigs,
    handleSubmit
  };
}
