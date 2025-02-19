
import React from "react";
import { format } from "date-fns";

interface CalendarViewProps {
  employees: any[];
  appointments: any[];
  currentDate: Date;
  onColumnClick: (e: React.MouseEvent, empId: number) => void;
  nowPosition: number | null;
  renderAppointmentBlock: (appointment: any, booking: any) => React.ReactNode;
  hourLabels: number[];
  START_HOUR: number;
  TOTAL_HOURS: number;
  PIXELS_PER_HOUR: number;
  formatTime: (time: number) => string;
  isSameDay: (date1: Date, date2: Date) => boolean;
}

export function CalendarView({
  employees,
  appointments,
  currentDate,
  onColumnClick,
  nowPosition,
  renderAppointmentBlock,
  hourLabels,
  START_HOUR,
  TOTAL_HOURS,
  PIXELS_PER_HOUR,
  formatTime,
  isSameDay
}: CalendarViewProps) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="flex">
        <div className="w-16 border-r" />
        {employees.map((emp: any) => (
          <div
            key={emp.id}
            className="flex-1 border-r flex items-center justify-center p-2"
          >
            <div className="flex flex-col items-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center font-bold text-white">
                {emp.avatar}
              </div>
              <div className="text-xs font-medium text-gray-700">
                {emp.name}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex">
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

        {employees.map((emp: any) => (
          <div
            key={emp.id}
            className="flex-1 border-r relative"
            style={{
              minWidth: "150px",
              height: TOTAL_HOURS * PIXELS_PER_HOUR,
            }}
            onClick={(e) => onColumnClick(e, emp.id)}
          >
            {Array.from({ length: TOTAL_HOURS * 4 }).map((_, idx) => (
              <div
                key={idx}
                className="absolute left-0 right-0 border-b"
                style={{ top: idx * 15 }}
              />
            ))}

            {nowPosition !== null && isSameDay(currentDate, new Date()) && (
              <div
                className="absolute left-0 right-0 h-[2px] bg-red-500 z-20"
                style={{ top: nowPosition }}
              />
            )}

            {appointments.map((appointment) =>
              appointment.bookings.map((booking) => {
                if (booking.employee?.id !== emp.id) return null;
                return renderAppointmentBlock(appointment, booking);
              })
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
