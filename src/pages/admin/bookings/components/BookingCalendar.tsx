
import React from 'react';
import { format } from 'date-fns';
import { EmployeeColumn } from './EmployeeColumn';
import { TimeColumn } from './TimeColumn';

interface BookingCalendarProps {
  employees: any[];
  appointments: any[];
  currentDate: Date;
  START_HOUR: number;
  END_HOUR: number;
  TOTAL_HOURS: number;
  PIXELS_PER_HOUR: number;
  nowPosition: number | null;
  handleColumnClick: (e: React.MouseEvent, empId: number) => void;
  formatTime: (time: number) => string;
  isSameDay: (date1: Date, date2: Date) => boolean;
}

export function BookingCalendar({
  employees,
  appointments,
  currentDate,
  START_HOUR,
  END_HOUR,
  TOTAL_HOURS,
  PIXELS_PER_HOUR,
  nowPosition,
  handleColumnClick,
  formatTime,
  isSameDay
}: BookingCalendarProps) {
  return (
    <div className="flex">
      <TimeColumn 
        START_HOUR={START_HOUR} 
        TOTAL_HOURS={TOTAL_HOURS} 
        formatTime={formatTime} 
      />
      
      {employees.map((emp: any) => (
        <EmployeeColumn
          key={emp.id}
          emp={emp}
          appointments={appointments}
          currentDate={currentDate}
          START_HOUR={START_HOUR}
          TOTAL_HOURS={TOTAL_HOURS}
          PIXELS_PER_HOUR={PIXELS_PER_HOUR}
          nowPosition={nowPosition}
          handleColumnClick={handleColumnClick}
          isSameDay={isSameDay}
        />
      ))}
    </div>
  );
}
