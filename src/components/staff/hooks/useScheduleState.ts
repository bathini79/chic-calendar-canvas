
import { useState } from 'react';

/**
 * Hook to manage scheduling state
 */
export const useScheduleState = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  return {
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime,
  };
};

export default useScheduleState;
