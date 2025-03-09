
import React from 'react';
import { Button } from '@/components/ui/button';
import { useBooking } from '../context/BookingContext';
import { SummaryView } from './SummaryView';

export const SummaryScreen: React.FC = () => {
  const { newAppointmentId, setCurrentScreen, setNewAppointmentId, SCREEN } = useBooking();

  if (!newAppointmentId) return null;

  return (
    <div className="p-6">
      <h3 className="text-xl font-semibold mb-6">
        Appointment Summary
      </h3>
      <SummaryView
        appointmentId={newAppointmentId}
      />
      <div className="mt-6 flex justify-end">
        <Button
          onClick={() => {
            setCurrentScreen(SCREEN.SERVICE_SELECTION);
            setNewAppointmentId(null);
          }}
        >
          Create New Appointment
        </Button>
      </div>
    </div>
  );
};
