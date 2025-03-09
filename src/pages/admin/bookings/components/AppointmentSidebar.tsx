
import React from "react";
import { SelectCustomer } from "@/components/admin/bookings/components/SelectCustomer";
import { ServiceSelectionScreen } from "./ServiceSelectionScreen";
import { CheckoutScreen } from "./CheckoutScreen";
import { SummaryScreen } from "./SummaryScreen";
import { SCREEN } from "../types";
import { useAppointmentWorkflow } from "../context/AppointmentWorkflowContext";
import { Service, Package } from "../types";
import { format } from "date-fns";

interface AppointmentSidebarProps {
  employees: any[];
  services: Service[];
  packages: Package[];
  onSaveAppointment: () => Promise<string | null>;
  isOpen: boolean;
  onClose: () => void;
}

export function AppointmentSidebar({
  employees,
  services,
  packages,
  onSaveAppointment,
  isOpen,
  onClose
}: AppointmentSidebarProps) {
  const {
    currentScreen,
    selectedCustomer,
    setSelectedCustomer,
    selectedDate
  } = useAppointmentWorkflow();

  // Only render if the sidebar is open
  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 w-full max-w-6xl h-full bg-white z-50 transform transition-transform duration-300 ease-in-out shadow-xl translate-x-0">
      <div className="flex flex-col h-full">
        <div className="p-6 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">New Appointment</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          {selectedDate && (
            <p className="text-sm text-muted-foreground mt-1">
              {format(selectedDate, "MMMM d, yyyy")}
            </p>
          )}
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-[30%] border-r">
            <SelectCustomer
              selectedCustomer={selectedCustomer}
              setSelectedCustomer={setSelectedCustomer}
              setShowCreateForm={() => {}}
            />
          </div>

          <div className="w-[70%] flex flex-col h-full">
            {currentScreen === SCREEN.SERVICE_SELECTION && (
              <ServiceSelectionScreen 
                employees={employees}
                onSaveAppointment={async () => {
                  const appointmentId = await onSaveAppointment();
                  if(appointmentId) {
                    onClose();
                  }
                }}
              />
            )}

            {currentScreen === SCREEN.CHECKOUT && (
              <CheckoutScreen 
                services={services}
                packages={packages}
                onSaveAppointment={onSaveAppointment}
              />
            )}

            {currentScreen === SCREEN.SUMMARY && (
              <SummaryScreen />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
