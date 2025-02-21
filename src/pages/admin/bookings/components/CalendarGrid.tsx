
import React from 'react';
import { formatTime, START_HOUR, PIXELS_PER_HOUR } from '../utils/timeUtils';
import { getAppointmentStatusColor } from '../utils/bookingUtils';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Employee, Appointment } from '../types';

interface CalendarGridProps {
  employees: Employee[];
  appointments: Appointment[];
  currentDate: Date;
  nowPosition: number | null;
  onColumnClick: (e: React.MouseEvent, empId: number) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

export function CalendarGrid({
  employees,
  appointments,
  currentDate,
  nowPosition,
  onColumnClick,
  onAppointmentClick,
}: CalendarGridProps) {
  const renderAppointmentBlock = (appointment: Appointment, booking: any) => {
    const statusColor = getAppointmentStatusColor(appointment.status);
    const duration =
      booking.service?.duration || booking.package?.duration || 60;
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
    <DndProvider backend={HTML5Backend}>
      <div className="flex">
        <div className="w-16 border-r">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div
              key={idx}
              className="h-[60px] flex items-center justify-end pr-1 text-[10px] text-gray-700 font-bold border-b"
            >
              {formatTime(START_HOUR + idx)}
            </div>
          ))}
        </div>

        {employees.map((emp: any) => (
          <div
            key={emp.id}
            className="flex-1 border-r relative"
            style={{
              minWidth: "150px",
              height: 12 * PIXELS_PER_HOUR,
            }}
            onClick={(e) => onColumnClick(e, emp.id)}
          >
            {Array.from({ length: 12 * 4 }).map((_, idx) => (
              <div
                key={idx}
                className="absolute left-0 right-0 border-b"
                style={{ top: idx * 15 }}
              />
            ))}

            {nowPosition !== null && (
              <div
                className="absolute left-0 right-0 h-[2px] bg-red-500 z-20"
                style={{ top: nowPosition }}
              />
            )}

            {appointments.map((appointment) =>
              appointment.bookings.map((booking) =>
                renderAppointmentBlock(appointment, booking)
              )
            )}
          </div>
        ))}
      </div>
    </DndProvider>
  );
}
