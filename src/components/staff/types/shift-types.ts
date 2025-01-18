export interface DayShift {
  startTime: string;
  endTime: string;
}

export interface DayConfig {
  enabled: boolean;
  shifts: DayShift[];
}

export interface WeekConfig {
  days: Record<string, DayConfig>;
}

export const DAYS = [
  { label: "Monday", value: "1", duration: "9h" },
  { label: "Tuesday", value: "2", duration: "9h" },
  { label: "Wednesday", value: "3", duration: "9h" },
  { label: "Thursday", value: "4", duration: "9h" },
  { label: "Friday", value: "5", duration: "9h" },
  { label: "Saturday", value: "6", duration: "7h" },
  { label: "Sunday", value: "0", duration: "0h" },
];

export const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

export const createDefaultDayConfig = (dayValue: string): DayConfig => ({
  enabled: false,
  shifts: [{
    startTime: "09:00",
    endTime: dayValue === "6" ? "17:00" : "18:00"
  }]
});

export const createDefaultWeekConfig = (): Record<string, DayConfig> => {
  const config: Record<string, DayConfig> = {};
  DAYS.forEach(day => {
    config[day.value] = createDefaultDayConfig(day.value);
  });
  return config;
};