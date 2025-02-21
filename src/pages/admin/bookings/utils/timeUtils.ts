
import { format, isSameDay as fnsIsSameDay } from 'date-fns';

export const START_HOUR = 9;
export const END_HOUR = 21;
export const TOTAL_HOURS = END_HOUR - START_HOUR;
export const PIXELS_PER_HOUR = 60;

export const hourLabels = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i
);

export const formatTime = (hour: number) => {
  const hours = Math.floor(hour);
  const minutes = Math.round((hour - hours) * 60);
  return format(
    new Date(2000, 0, 1, hours, minutes),
    'h:mm a'
  );
};

export const isSameDay = (date1: Date, date2: Date) => {
  return fnsIsSameDay(date1, date2);
};
