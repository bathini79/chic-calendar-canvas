import React from "react";
import { format } from "date-fns";
import { Appointment } from "../../bookings/types";

export interface TimeSlotsProps {
  employees: any[];
  formatTime: (time: number) => string;
  TOTAL_HOURS: number;
  currentDate: Date;
  nowPosition: number;
  isSameDay: (date1: Date, date2: Date) => boolean;
  appointments: Appointment[];
  setSelectedAppointment: (appointment: Appointment | null) => void;
  setClickedCell: (cell: { employeeId: string; time: number; x: number; y: number; date: Date }) => void;
}

const PIXELS_PER_HOUR = 120;

const hourLabels = Array.from({ length: 24 }, (_, i) => {
  const hour = i % 12 || 12;
  const ampm = i < 12 ? "AM" : "PM";
  return `${hour}${ampm}`;
});

export default function TimeSlots({
  employees,
  formatTime,
  TOTAL_HOURS,
  currentDate,
  nowPosition,
  isSameDay,
  appointments,
  setSelectedAppointment,
  setClickedCell,
}: TimeSlotsProps) {
  const handleColumnClick = (employeeId: string, time: number, x: number, y: number) => {
    const cellDate = new Date(currentDate);
    setClickedCell({ employeeId, time, x, y, date: cellDate });
  };

  const renderAppointmentBlock = (appointment: Appointment) => {
    const startTime = new Date(appointment.start_time);
    const endTime = new Date(appointment.end_time);

    const startOfDay = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate()
    );
    const appointmentStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      startTime.getHours(),
      startTime.getMinutes()
    );
    const appointmentEnd = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      endTime.getHours(),
      endTime.getMinutes()
    );

    const top =
      ((appointmentStart.getTime() - startOfDay.getTime()) /
        (1000 * 60 * 60)) *
      PIXELS_PER_HOUR;
    const height =
      ((appointmentEnd.getTime() - appointmentStart.getTime()) /
        (1000 * 60 * 60)) *
      PIXELS_PER_HOUR;

    return (
      <div
        key={appointment.id}
        className="absolute bg-blue-500 text-white p-2 text-xs rounded cursor-pointer hover:opacity-80"
        style={{
          top: `${top}px`,
          height: `${height}px`,
          left: 0,
          width: "100%",
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedAppointment(appointment);
        }}
      >
        {appointment.customer?.full_name}
        <br />
        {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
      </div>
    );
  };

  return (
    <div className="flex">
      <div className="sticky left-0 z-10 bg-gray-50 border-r w-24 flex-shrink-0">
        <div className="h-12 border-b"></div>
        {hourLabels.map((hour, index) => (
          <div
            key={index}
            className="h-[120px] border-b text-xs text-gray-500 flex items-center justify-center"
          >
            {hour}
          </div>
        ))}
      </div>

      <div className="w-full overflow-x-auto">
        <div
          className="relative"
          style={{
            width: `${employees.length * 200}px`,
            height: `${TOTAL_HOURS * PIXELS_PER_HOUR}px`,
          }}
        >
          <div
            className="absolute bg-red-200"
            style={{
              left: 0,
              top: `${nowPosition}px`,
              width: `${employees.length * 200}px`,
              height: "1px",
            }}
          ></div>

          <div className="flex">
            {employees.map((employee) => (
              <div key={employee.id} className="w-[200px] border-r first:border-l">
                <div className="h-12 border-b font-semibold text-sm flex items-center justify-center sticky top-0 z-10 bg-gray-100">
                  {employee.name}
                </div>
                {Array.from({ length: TOTAL_HOURS }).map((_, hour) => {
                  const time = hour + 8;
                  return (
                    <div
                      key={hour}
                      className="relative h-[120px] border-b last:border-b-0 cursor-pointer"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        handleColumnClick(employee.id, time, rect.x, rect.y);
                      }}
                    >
                      {appointments
                        .filter((appointment) => {
                          const appointmentDate = new Date(appointment.start_time);
                          return (
                            isSameDay(appointmentDate, currentDate) &&
                            appointment.bookings.some(
                              (booking) =>
                                booking.employee_id === employee.id &&
                                new Date(booking.start_time).getHours() === time
                            )
                          );
                        })
                        .map(renderAppointmentBlock)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
