
import React from 'react';

interface TimeColumnProps {
  START_HOUR: number;
  TOTAL_HOURS: number;
  formatTime: (time: number) => string;
}

export function TimeColumn({ START_HOUR, TOTAL_HOURS, formatTime }: TimeColumnProps) {
  const hourLabels = Array.from({ length: TOTAL_HOURS }, (_, i) => i + START_HOUR);

  return (
    <div className="w-16 border-r">
      {hourLabels.map((hr) => (
        <div
          key={hr}
          className="h-[60px] flex items-center justify-end pr-1 text-[10px] text-gray-700 font-bold border-b"
        >
          {formatTime(hr)}
        </div>
      ))}
    </div>
  );
}
