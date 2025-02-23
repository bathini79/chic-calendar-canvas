
import { getAppointmentStatusColor } from "@/pages/admin/bookings/utils/bookingUtils";
import {
  START_HOUR,
  PIXELS_PER_HOUR,
  hourLabels,
} from "@/pages/admin/bookings/utils/timeUtils";
import React from "react";
import { Appointment, Booking, Employee } from "@/pages/admin/bookings/types";

interface TimeSlotsProps {
  employees: Employee[];
  hourLabels: number[];
  formatTime: (hr: number) => string;
  TOTAL_HOURS: number;
  PIXELS_PER_HOUR: number;
  handleColumnClick: (e: React.MouseEvent, empId: string) => void;
  currentDate: Date;
  nowPosition: number | null;
  isSameDay: (date1: Date, date2: Date) => boolean;
  appointments: Appointment[];
  renderAppointmentBlock: (
    appointment: Appointment,
    booking: Booking
  ) => JSX.Element | null;
  setSelectedAppointment: (appointment: Appointment) => void;
  setClickedCell: (cell: {
    employeeId: string;
    time: number;
    x: number;
    y: number;
    date: Date;
  }) => void;
}

const TimeSlots: React.FC<TimeSlotsProps> = ({
  employees,
  formatTime,
  TOTAL_HOURS,
  nowPosition,
  isSameDay,
  appointments,
  setSelectedAppointment,
  setClickedCell,
  currentDate,
}) => {
  const handleColumnClick = (e: React.MouseEvent, empId: string) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    let clickedTime = START_HOUR + offsetY / PIXELS_PER_HOUR;
    clickedTime = Math.round(clickedTime * 4) / 4;

    setClickedCell({
      employeeId: empId,
      time: clickedTime,
      x: e.pageX + 10,
      y: e.pageY - 20,
      date: currentDate,
    });
  };

  const renderAppointmentBlock = (appointment: Appointment, booking: Booking) => {
    if (!booking.id) return null;
    
    const statusColor = getAppointmentStatusColor(appointment.status || 'pending');
    const duration = booking.service?.duration || booking.package?.duration || 60;
    const startTime = new Date(booking.start_time);
    const startHour = startTime.getHours() + startTime.getMinutes() / 60;

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
          setSelectedAppointment(appointment);
        }}
      >
        <div className="p-2 text-xs">
          <div className="font-medium truncate">
            {appointment.customer?.full_name || 'No name'}
          </div>
          <div className="truncate text-gray-600">
            {booking.service?.name || booking.package?.name || 'Unnamed service'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex">
        <div className="w-16 border-r" />
        {employees.map((emp: Employee) => (
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

        {employees.map((emp: Employee) => (
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
};

export default TimeSlots;
