
import React, { useState } from "react";
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
  const [hoveredTimeSlot, setHoveredTimeSlot] = useState<string | null>(null);

  const handleColumnClick = (employeeId: string, time: number, x: number, y: number) => {
    const cellDate = new Date(currentDate);
    setClickedCell({ employeeId, time, x, y, date: cellDate });
  };

  const renderAppointmentBlock = (appointment: Appointment, employeeId: string) => {
    // Filter to only bookings for this employee OR unassigned bookings for the default employee
    const relevantBookings = appointment.bookings.filter(booking => {
      if (employeeId === 'unassigned') {
        // For the unassigned column, show only unassigned bookings
        return !booking.employee_id || booking.employee_id === null;
      } else {
        // For employee columns, show only bookings assigned to that employee
        return booking.employee_id === employeeId;
      }
    });

    if (relevantBookings.length === 0) return null;

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

    // Check if this timeSlot is being hovered
    const hourKey = Math.floor(startTime.getHours() + startTime.getMinutes() / 60);
    const isTimeSlotHovered = hoveredTimeSlot === `${employeeId}-${hourKey}`;

    return (
      <div
        key={appointment.id}
        className={`absolute bg-blue-500 text-white p-2 text-xs rounded cursor-pointer hover:opacity-80 transition-all ${
          isTimeSlotHovered ? 'shadow-md ring-2 ring-blue-300' : ''
        }`}
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

  // Group appointments by hour and employee
  const renderTimeSlotAppointments = (employeeId: string, hour: number) => {
    const hourAppointments = appointments.filter(appointment => {
      const startHour = new Date(appointment.start_time).getHours();
      return startHour === hour;
    });

    if (hourAppointments.length === 0) return null;

    // Separate appointments that overlap in this hour
    const appointmentsForEmployee = hourAppointments.filter(appointment => 
      appointment.bookings.some(booking => {
        if (employeeId === 'unassigned') {
          return !booking.employee_id || booking.employee_id === null;
        } else {
          return booking.employee_id === employeeId;
        }
      })
    );

    if (appointmentsForEmployee.length <= 1) {
      // If there's only one appointment, render it normally
      return appointmentsForEmployee.map(appointment => 
        renderAppointmentBlock(appointment, employeeId)
      );
    }

    // If there are multiple appointments, stack them vertically
    return appointmentsForEmployee.map((appointment, index) => {
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
      
      const top =
        ((appointmentStart.getTime() - startOfDay.getTime()) /
          (1000 * 60 * 60)) *
        PIXELS_PER_HOUR;
      
      // Calculate height for each stacked appointment
      const totalHeight = 
        ((endTime.getTime() - startTime.getTime()) /
          (1000 * 60 * 60)) *
        PIXELS_PER_HOUR;
      
      const heightPerAppointment = totalHeight / appointmentsForEmployee.length;
      
      // Check if this timeSlot is being hovered
      const hourKey = Math.floor(startTime.getHours() + startTime.getMinutes() / 60);
      const isTimeSlotHovered = hoveredTimeSlot === `${employeeId}-${hourKey}`;

      return (
        <div
          key={`${appointment.id}-${index}`}
          className={`absolute bg-blue-500 text-white p-2 text-xs rounded cursor-pointer hover:opacity-80 transition-all ${
            isTimeSlotHovered ? 'shadow-md ring-2 ring-blue-300' : ''
          }`}
          style={{
            top: `${top + (index * heightPerAppointment)}px`,
            height: `${heightPerAppointment}px`,
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
    });
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
                  const time = hour + 8; // Start at 8 AM
                  const hourKey = `${employee.id}-${time}`;
                  const isHovered = hoveredTimeSlot === hourKey;
                  
                  return (
                    <div
                      key={hour}
                      className={`relative h-[120px] border-b last:border-b-0 cursor-pointer transition-colors ${
                        isHovered ? 'bg-blue-50' : ''
                      }`}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        // Calculate the exact position within the cell
                        const offsetY = e.clientY - rect.top;
                        // Calculate precise time with minutes
                        const exactTime = time + (offsetY / PIXELS_PER_HOUR);
                        // Round to nearest 15 minute increment
                        const roundedTime = Math.floor(exactTime * 4) / 4;
                        handleColumnClick(employee.id, roundedTime, e.clientX, e.clientY);
                      }}
                      onMouseEnter={() => setHoveredTimeSlot(hourKey)}
                      onMouseLeave={() => setHoveredTimeSlot(null)}
                    >
                      {renderTimeSlotAppointments(employee.id, time)}
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
