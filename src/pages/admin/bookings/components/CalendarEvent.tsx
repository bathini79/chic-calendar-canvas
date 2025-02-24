
import React from 'react';
import { format } from 'date-fns';
import { Flag } from 'lucide-react';
import type { Appointment } from '../types';

interface CalendarEventProps {
  appointment: Appointment;
  onClick: (appointment: Appointment) => void;
}

export function CalendarEvent({ appointment, onClick }: CalendarEventProps) {
  // Don't render cancelled or voided appointments
  if (appointment.status === 'canceled' || appointment.status === 'voided') {
    return null;
  }

  const isNoShow = appointment.status === 'noshow';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'noshow':
        return 'bg-red-100 border-red-300 text-red-700';
      case 'completed':
        return 'booking-confirmed';
      case 'pending':
        return 'booking-pending';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  return (
    <div
      className={`booking-block ${getStatusColor(appointment.status)} border cursor-pointer relative`}
      onClick={() => onClick(appointment)}
    >
      {isNoShow && (
        <div className="absolute -top-2 -left-2 bg-red-100 rounded-full p-1 border border-red-300">
          <Flag className="h-4 w-4 text-red-600" />
        </div>
      )}
      <div className="font-medium">
        {appointment.customer?.full_name}
      </div>
      <div className="text-sm">
        {format(new Date(appointment.start_time), 'h:mm a')}
      </div>
      <div className="text-sm">
        {appointment.bookings.map((booking) => (
          <div key={booking.id}>
            {booking.service?.name || booking.package?.name}
          </div>
        ))}
      </div>
    </div>
  );
}
