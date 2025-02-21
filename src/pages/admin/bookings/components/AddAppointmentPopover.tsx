
import React from 'react';
import { CalendarIcon } from 'lucide-react';

interface AddAppointmentPopoverProps {
  x: number;
  y: number;
  time: number;
  onAddAppointment: () => void;
}

export function AddAppointmentPopover({
  x,
  y,
  time,
  onAddAppointment,
}: AddAppointmentPopoverProps) {
  return (
    <div
      className="fixed z-50 w-48 rounded-lg shadow-lg border border-gray-200 overflow-hidden"
      style={{
        left: x,
        top: y,
      }}
    >
      <div className="bg-black px-4 py-2 text-sm font-medium text-white">
        {formatTime(time)}
      </div>
      <div
        className="bg-white px-4 py-3 flex items-center space-x-3 text-sm cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onAddAppointment}
      >
        <CalendarIcon className="h-4 w-4 text-gray-600" />
        <span className="text-gray-700">Add Appointment</span>
      </div>
    </div>
  );
}
