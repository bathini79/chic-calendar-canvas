
import { getAppointmentStatusColor } from "@/pages/admin/bookings/utils/bookingUtils";
import {
  START_HOUR,
  PIXELS_PER_HOUR,
  hourLabels,
} from "@/pages/admin/bookings/utils/timeUtils";
import { Flag } from "lucide-react";
import React, { useState, useEffect } from "react";
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

interface BookingsByTimeSlot {
  [key: string]: {
    bookings: {
      booking: Booking;
      appointment: Appointment;
    }[];
  };
}

const TimeSlots: React.FC<TimeSlotsProps> = ({
  employees,
  hourLabels,
  formatTime,
  TOTAL_HOURS,
  PIXELS_PER_HOUR,
  nowPosition,
  isSameDay,
  appointments,
  setSelectedAppointment,
  setClickedCell,
  currentDate,
}) => {
  const [dataVersion, setDataVersion] = useState(0);

  // Update dataVersion when appointments change to force rerender
  useEffect(() => {
    setDataVersion((prev) => prev + 1);
  }, [appointments]);
  
  const handleColumnClick = (e: React.MouseEvent, empId: string) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    
    // Use the first hour from hourLabels as the start hour
    const startHourValue = hourLabels[0] || START_HOUR;
    let clickedTime = startHourValue + offsetY / PIXELS_PER_HOUR;
    clickedTime = Math.round(clickedTime * 4) / 4;

    setClickedCell({
      employeeId: empId,
      time: clickedTime,
      x: e.pageX + 10,
      y: e.pageY - 20,
      date: currentDate,
    });
  };

  const renderAppointmentBlocks = (employeeId: string) => {
    // Group bookings by time slot to avoid overlaps
    const bookingsByTimeSlot: BookingsByTimeSlot = {};

    appointments.forEach((appointment) => {
      if (!appointment.bookings) return;
      
      appointment.bookings.forEach((booking) => {
        // Check if this booking should be shown for the current employee
        // Either it's assigned to this employee OR it's unassigned and we're on the default employee
        const isForThisEmployee =
          booking.employee?.id === employeeId ||
          ((!booking.employee_id || booking.employee_id === null) &&
            employeeId === "unassigned");

        if (!isForThisEmployee) return;
        if (
          appointment.status === "cancelled" ||
          appointment.status === "no-show" || // Fixed to match the actual enum value "no-show"
          !booking.id
        )
          return;

        const startTime = new Date(
          booking.start_time || appointment.start_time
        );
        const startHour = startTime.getHours() + startTime.getMinutes() / 60;
        const roundedStartHour = Math.floor(startHour * 4) / 4; // Round to nearest 15 min

        const timeSlotKey = `${roundedStartHour}`;

        if (!bookingsByTimeSlot[timeSlotKey]) {
          bookingsByTimeSlot[timeSlotKey] = { bookings: [] };
        }

        bookingsByTimeSlot[timeSlotKey].bookings.push({
          booking,
          appointment,
        });
      });
    });

    // Render bookings for each time slot
    return Object.entries(bookingsByTimeSlot)
      .map(([timeSlotKey, { bookings }]) => {
        return bookings.map((bookingData, index) => {
          const { booking, appointment } = bookingData;
          const totalBookingsInSlot = bookings.length;

          // Calculate booking display properties
          const isNoShow = appointment.status === "no-show";
          const statusColor = isNoShow 
            ? 'bg-red-100 border-red-300 text-red-700'
            : getAppointmentStatusColor(appointment.status);
      
          const duration =
            booking.service?.duration || booking.package?.duration || 60;
          const startTime = new Date(
            booking.start_time || appointment.start_time
          );
          
          // Use the first hour from hourLabels as the start hour
          const startHourValue = hourLabels[0] || START_HOUR;
          const startHour = startTime.getHours() + startTime.getMinutes() / 60;
          const cellKey = `${employeeId}-${timeSlotKey}-${index}-${dataVersion}`;
          
          // Position calculations for multiple bookings in the same slot
          // Add a small offset to ensure visibility within the cell boundaries
          const topPositionPx = Math.max(
            0,
            (startHour - startHourValue) * PIXELS_PER_HOUR
          );
          const heightPx = Math.max(30, (duration / 60) * PIXELS_PER_HOUR); // Ensure minimum height

          // Arrange bookings horizontally in columns
          const widthPerBooking = 100 / totalBookingsInSlot;
          const leftOffset = index * widthPerBooking;

          // Add a small gap between columns for better visual separation
          const gapSize = 1; // 1% gap
          const adjustedWidth = widthPerBooking - gapSize;

          return (
            <div
              key={`${booking.id}-${index}-${dataVersion}`}
              className={`absolute rounded border ${statusColor} cursor-pointer z-10 overflow-hidden transition-colors`}
              style={{
                top: `${topPositionPx}px`,
                height: `${heightPx}px`,
                left: `${leftOffset + gapSize / 2}%`,
                width: `${adjustedWidth}%`,
                zIndex: 10 + index, // Higher index items appear in front
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedAppointment(appointment);
              }}
            >
              {isNoShow && (
                <div className="absolute -top-2 -left-2 bg-red-100 rounded-full p-1 border border-red-300">
                  <Flag className="h-4 w-4 text-red-600" />
                </div>
              )}
              <div className="p-2 text-xs">
                <div className="font-medium truncate">
                  {appointment.customer?.full_name || "No name"}
                </div>
                <div className="truncate text-gray-600">
                  {booking.service?.name ||
                    booking.package?.name ||
                    "Unnamed service"}
                </div>
              </div>
            </div>
          );
        });
      })
      .flat();
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
                {emp.avatar || emp.photo_url?.charAt(0) || emp.name?.charAt(0) || "?"}
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

            {renderAppointmentBlocks(emp.id)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimeSlots;
