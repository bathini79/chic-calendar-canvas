
import { useState, useEffect } from 'react';
import { START_HOUR, END_HOUR, PIXELS_PER_HOUR } from '../utils/timeUtils';

export function useCalendarState() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [nowPosition, setNowPosition] = useState<number | null>(null);

  useEffect(() => {
    const updateNow = () => {
      const now = new Date();
      const currentHour = now.getHours() + now.getMinutes() / 60;
      if (currentHour >= START_HOUR && currentHour <= END_HOUR) {
        setNowPosition((currentHour - START_HOUR) * PIXELS_PER_HOUR);
      } else {
        setNowPosition(null);
      }
    };
    updateNow();
    const intervalId = setInterval(updateNow, 60000);
    return () => clearInterval(intervalId);
  }, []);

  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };
  const goNext = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  return {
    currentDate,
    setCurrentDate,
    nowPosition,
    goToday,
    goPrev,
    goNext,
  };
}
