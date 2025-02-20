
import { format } from 'date-fns';

export const START_HOUR = 8;
export const END_HOUR = 20;
export const TOTAL_HOURS = END_HOUR - START_HOUR;
export const PIXELS_PER_HOUR = 60;
export const hourLabels = Array.from({ length: 12 }, (_, i) => i + START_HOUR);
export const formatTime = (time: number) => {
  const hours = Math.floor(time);
  const minutes = Math.round((time - hours) * 60);
  const period = hours >= 12 ? "pm" : "am";
  let displayHour = hours % 12;
  if (displayHour === 0) displayHour = 12;
  return `${displayHour}:${minutes.toString().padStart(2, "0")}${period}`;
};

export const formatDateTime = (date: Date, time: string) => {
  return `${format(date, 'yyyy-MM-dd')} ${time}`;
};

export const isSameDay = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};
