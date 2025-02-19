
import React from 'react';
import { formatTime, isSameDay } from '../utils/timeFormatting';
import { START_HOUR, TOTAL_HOURS, PIXELS_PER_HOUR } from '../utils/bookingUtils';

interface BookingCalendarViewProps {
  employees: any[];
  currentDate: Date;
  appointments: any[];
  nowPosition: number | null;
  onColumnClick: (e: React.MouseEvent, empId: number) => void;
  onAppointmentClick: (appointment: any) => void;
}

export function BookingCalendarView({
  employees,
  currentDate,
  appointments,
  nowPosition,
  onColumnClick,
  onAppointmentClick,
}: BookingCalendarViewProps) {
  const hourLabels = Array.from({ length: 12 }, (_, i) => i + START_HOUR);

  const getAppointmentStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 hover:bg-green-200 border-green-300";
      case "canceled":
        return "bg-red-100 hover:bg-red-200 border-red-300";
      default:
        return "bg-purple-100 hover:bg-purple-200 border-purple-300";
    }
  };

  const renderAppointmentBlock = (appointment: any, booking: any) => {
    const statusColor = getAppointmentStatusColor(appointment.status);
    const duration = booking.service?.duration || booking.package?.duration || 60;
    const startHour =
      new Date(booking.start_time).getHours() +
      new Date(booking.start_time).getMinutes() / 60;

    const topPositionPx = (startHour - START_HOUR) * PIXELS_PER_HOUR;
    const heightPx = (duration / 60) * PIXELS_PER_HOUR;

    return (
      <div
        key={booking.id}
        className={`absolute left-2 right-2 rounded border ${statusColor} cursor-pointer z-10 overflow-hidden`}
        style={{
          top: `${topPositionPx}px`,
          height: `${heightPx}px`,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onAppointmentClick(appointment);
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
  };

  return (
    <div className="flex-1 overflow-auto">
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
              appointment.bookings.map((booking: any) => {
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
