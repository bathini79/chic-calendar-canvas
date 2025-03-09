
import React from "react";
import { Button } from "@/components/ui/button";
import { SummaryView } from "./SummaryView";
import { useAppointmentWorkflow } from "../context/AppointmentWorkflowContext";

export function SummaryScreen() {
  const {
    newAppointmentId,
    setCurrentScreen,
    setNewAppointmentId,
    resetState
  } = useAppointmentWorkflow();
  
  const handleCreateNewAppointment = () => {
    setCurrentScreen(SCREEN.SERVICE_SELECTION);
    setNewAppointmentId(null);
    resetState();
  };

  if (!newAppointmentId) {
    return null;
  }

  return (
    <div className="p-6">
      <h3 className="text-xl font-semibold mb-6">
        Appointment Summary
      </h3>
      <SummaryView appointmentId={newAppointmentId} />
      <div className="mt-6 flex justify-end">
        <Button onClick={handleCreateNewAppointment}>
          Create New Appointment
        </Button>
      </div>
    </div>
  );
}
