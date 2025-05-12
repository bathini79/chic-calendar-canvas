import { getAppointmentStatusColor } from "@/pages/admin/bookings/utils/bookingUtils";
import {
  START_HOUR,
  PIXELS_PER_HOUR,
  hourLabels,
} from "@/pages/admin/bookings/utils/timeUtils";
import { Flag } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { Appointment, Booking, Employee } from "@/pages/admin/bookings/types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile"; // Import the mobile hook

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
  isLoading?: boolean; // New prop for loading state
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
  isLoading = false, // Default to false if not provided
}) => {
  const isMobile = useIsMobile(); // Use the mobile hook
  const [dataVersion, setDataVersion] = useState(0);
  // Create refs for synchronized scrolling
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  
  // Get effective pixels per hour based on mobile/desktop
  const effectivePixelsPerHour = isMobile ? PIXELS_PER_HOUR * 0.83 : PIXELS_PER_HOUR; // 50px for mobile, 60px for desktop
  
  // Update dataVersion when appointments change to force rerender
  useEffect(() => {
    setDataVersion((prev) => prev + 1);
  }, [appointments]);
  
  // Function to handle synchronized scrolling
  const handleSyncScroll = (e: React.UIEvent<HTMLDivElement>, source: 'header' | 'grid') => {
    if (source === 'header' && gridScrollRef.current) {
      gridScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    } else if (source === 'grid' && headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleColumnClick= (e: React.MouseEvent, empId: string) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    
    // Use the first hour from hourLabels as the start hour
    const startHourValue = hourLabels[0] || START_HOUR;
    let clickedTime = startHourValue + offsetY / effectivePixelsPerHour;
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
            (startHour - startHourValue) * effectivePixelsPerHour
          );
          
          // Use effectivePixelsPerHour for height calculations
          const heightPx = Math.max(20, (duration / 60) * effectivePixelsPerHour); // Smaller minimum height on mobile

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
                  <Flag className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-red-600`} />
                </div>
              )}
              <div className={`${isMobile ? 'p-1' : 'p-2'} text-xs`}>
                <div className="font-medium truncate" style={{ fontSize: isMobile ? '0.65rem' : 'inherit' }}>
                  {appointment.customer?.full_name || "No name"}
                </div>
                <div className="truncate text-gray-600" style={{ fontSize: isMobile ? '0.65rem' : 'inherit' }}>
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
    <div className="flex-1 overflow-hidden">
      {/* Container with sticky header row */}
      <div className="flex flex-col w-full h-full">        {/* Employee headers row - horizontally scrollable, aligned with content */}
        <div className="flex relative border-b">
          <div className={`${isMobile ? 'w-12' : 'w-16'} border-r border-r-gray-300 flex-shrink-0 sticky left-0 z-30 bg-white shadow-sm`} />          <div 
            ref={headerScrollRef}
            onScroll={(e) => handleSyncScroll(e, 'header')}
            className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300" 
            style={{ 
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: isMobile ? 'thin' : 'auto',
              msOverflowStyle: '-ms-autohiding-scrollbar',
              scrollbarWidth: isMobile ? 'none' : 'auto' // Hide scrollbar on mobile
            }}>
            {isLoading ? (
              // Skeleton loaders for employee headers
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`skeleton-header-${index}`}
                  className="flex-shrink-0 border-r flex items-center justify-center p-2"
                  style={{ width: isMobile ? '120px' : '150px' }}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              ))
            ) : (
              employees.map((emp: Employee) => (
                <div
                  key={emp.id}
                  className="flex-shrink-0 border-r flex items-center justify-center p-2"
                  style={{ 
                    width: isMobile ? '120px' : '150px' // Match the column width
                  }}
                >                  <div className="flex flex-col items-center space-y-1">
                    <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-gray-300 flex items-center justify-center font-bold text-white`}>
                      {emp.avatar || emp.photo_url?.charAt(0) || emp.name?.charAt(0) || "?"}
                    </div>
                    <div className={`text-xs font-medium text-gray-700 truncate max-w-full ${isMobile ? 'text-[0.65rem]' : ''}`}>
                      {isMobile && emp.name && emp.name.length > 8 ? `${emp.name.substring(0, 7)}...` : emp.name}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>        {/* Main calendar grid - fully scrollable */}
        <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-300" style={{ overscrollBehavior: 'contain' }}>
          <div className="flex">
            {/* Time labels column - sticky */}
            <div className={`${isMobile ? 'w-12' : 'w-16'} border-r border-r-gray-300 flex-shrink-0 sticky left-0 z-20 bg-white shadow-sm`}>              {hourLabels.map((hr) => (
                <div
                  key={hr}
                  className={`${isMobile ? 'h-[50px]' : 'h-[60px]'} flex items-center justify-end pr-1 text-gray-700 font-bold border-b`}
                  style={{ 
                    fontSize: isMobile ? '0.65rem' : '0.75rem',
                    height: `${effectivePixelsPerHour}px` // Dynamic height based on device
                  }}
                >
                  {isMobile ? hr : formatTime(hr)}
                </div>
              ))}
            </div>            {/* Scrollable grid area - synchronized with header */}
            <div 
              ref={gridScrollRef}
              onScroll={(e) => handleSyncScroll(e, 'grid')}
              className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300" 
              style={{ 
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: isMobile ? 'thin' : 'auto',
                msOverflowStyle: '-ms-autohiding-scrollbar'
              }}>
              {isLoading ? (
                // Skeleton loaders for employee columns
                Array.from({ length: 4 }).map((_, index) => (
                  <div 
                    key={`skeleton-column-${index}`}
                    className="flex-shrink-0 border-r relative"
                    style={{
                    height: TOTAL_HOURS * effectivePixelsPerHour,
                    width: isMobile ? '120px' : '150px',
                  }}
                  >
                    {Array.from({ length: TOTAL_HOURS * 4 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="absolute left-0 right-0 border-b"
                        style={{ 
                          top: isMobile ? idx * 12.5 : idx * 15,
                          borderColor: idx % 4 === 0 ? '#e5e7eb' : '#f3f4f6'
                        }}
                      />
                    ))}
                    <Skeleton className="absolute left-[5%] top-[10%] h-20 w-[90%] rounded-md" />
                    <Skeleton className="absolute left-[5%] top-[40%] h-16 w-[90%] rounded-md" />
                    <Skeleton className="absolute left-[5%] top-[70%] h-24 w-[90%] rounded-md" />                  </div>
                ))
              ) : (
                employees.map((emp: Employee) => (                  <div
                    key={emp.id}
                    className="flex-shrink-0 border-r relative"
                    style={{
                      height: TOTAL_HOURS * effectivePixelsPerHour,
                      width: isMobile ? '120px' : '150px',
                      minWidth: isMobile ? '120px' : '150px', // Ensure consistent width on mobile
                      touchAction: 'manipulation' // Improve touch handling
                    }}
                    onClick={(e) => handleColumnClick(e, emp.id)}
                  >
                    {Array.from({ length: TOTAL_HOURS * 4 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="absolute left-0 right-0 border-b"
                        style={{ 
                          top: isMobile ? idx * 12.5 : idx * 15,
                          borderColor: idx % 4 === 0 ? '#e5e7eb' : '#f3f4f6'
                        }}
                      />
                    ))}
                    
                    {nowPosition !== null && isSameDay(currentDate, new Date()) && (
                      <div
                        className="absolute left-0 right-0 h-[2px] bg-red-500 z-20"
                        style={{ 
                          top: (nowPosition / PIXELS_PER_HOUR) * effectivePixelsPerHour,
                          boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)'
                        }}
                      />
                    )}
                      {renderAppointmentBlocks(emp.id)}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeSlots;
