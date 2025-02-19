
import React from 'react';

interface EmployeeColumnProps {
  emp: any;
  appointments: any[];
  currentDate: Date;
  START_HOUR: number;
  TOTAL_HOURS: number;
  PIXELS_PER_HOUR: number;
  nowPosition: number | null;
  handleColumnClick: (e: React.MouseEvent, empId: number) => void;
  isSameDay: (date1: Date, date2: Date) => boolean;
}

export function EmployeeColumn({
  emp,
  appointments,
  currentDate,
  START_HOUR,
  TOTAL_HOURS,
  PIXELS_PER_HOUR,
  nowPosition,
  handleColumnClick,
  isSameDay
}: EmployeeColumnProps) {
  return (
    <div
      key={emp.id}
      className="flex-1 border-r relative"
      style={{
        minWidth: "150px",
        height: TOTAL_HOURS * PIXELS_PER_HOUR,
      }}
      onClick={(e) => handleColumnClick(e, emp.id)}
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
        appointment.bookings.map((booking: any) => {
          if (booking.employee?.id !== emp.id) return null;

          const startTime = new Date(booking.start_time);
          const startHour = startTime.getHours() + startTime.getMinutes() / 60;
          const duration = booking.service?.duration || booking.package?.duration || 60;
          const topPositionPx = (startHour - START_HOUR) * PIXELS_PER_HOUR;
          const heightPx = (duration / 60) * PIXELS_PER_HOUR;

          return (
            <div
              key={booking.id}
              className={`absolute left-2 right-2 rounded border cursor-pointer z-10 overflow-hidden ${
                appointment.status === "confirmed"
                  ? "bg-green-100 hover:bg-green-200 border-green-300"
                  : appointment.status === "canceled"
                  ? "bg-red-100 hover:bg-red-200 border-red-300"
                  : "bg-purple-100 hover:bg-purple-200 border-purple-300"
              }`}
              style={{
                top: `${topPositionPx}px`,
                height: `${heightPx}px`,
              }}
            >
              <div className="p-2 text-xs">
                <div className="font-medium truncate">
                  {appointment.customer?.full_name}
                </div>
                <div className="truncate text-gray-600">
                  {booking.service?.name || booking.package?.name}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
