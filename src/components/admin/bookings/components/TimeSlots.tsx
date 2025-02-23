
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
  renderAppointmentBlock: (appointment: Appointment, booking: Booking) => JSX.Element | null;
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
  PIXELS_PER_HOUR,
  handleColumnClick,
  currentDate,
  nowPosition,
  isSameDay,
  appointments,
  renderAppointmentBlock,
  setSelectedAppointment,
  setClickedCell,
}) => {
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
                {emp.avatar || emp.name.charAt(0)}
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
              appointment.bookings
                .filter(booking => booking.employee?.id === emp.id)
                .map(booking => renderAppointmentBlock(appointment, booking))
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimeSlots;
