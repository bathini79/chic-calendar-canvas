
import React from 'react';
import { SelectCustomer } from "@/components/admin/bookings/components/SelectCustomer";
import { ServiceSelectionScreen } from './ServiceSelectionScreen';
import { CheckoutSection } from './CheckoutSection';
import { SummaryView } from './SummaryView';
import { Button } from "@/components/ui/button";
import { SCREEN } from '../types';
import { useAppointmentWorkflow } from '../context/AppointmentWorkflowContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface AppointmentSidebarProps {
  employees: any[];
  services: any[];
  packages: any[];
}

export const AppointmentSidebar: React.FC<AppointmentSidebarProps> = ({
  employees,
  services,
  packages
}) => {
  const {
    currentScreen,
    selectedCustomer,
    setSelectedCustomer,
    setShowCreateForm,
    newAppointmentId,
    isAddAppointmentOpen,
    handleCloseAppointment,
    selectedTime,
    selectedDate,
    setCurrentScreen,
    setNewAppointmentId
  } = useAppointmentWorkflow();

  // Monitor state changes for debugging
  React.useEffect(() => {
    console.log('Current screen:', currentScreen);
    console.log('New appointment ID:', newAppointmentId);
  }, [currentScreen, newAppointmentId]);

  const handleCreateNewAppointment = () => {
    setCurrentScreen(SCREEN.SERVICE_SELECTION);
    setNewAppointmentId(null);
  };

  return (
    <div
      className={`fixed top-0 right-0 w-full max-w-6xl h-full bg-white z-50 transform transition-transform duration-300 ease-in-out shadow-xl ${
        isAddAppointmentOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex flex-col h-full">
        <div className="p-6 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">New Appointment</h2>
            <button
              onClick={handleCloseAppointment}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          {selectedDate && selectedTime && (
            <p className="text-sm text-muted-foreground mt-1">
              {format(selectedDate, "MMMM d, yyyy")} at {selectedTime}
            </p>
          )}
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-[30%] border-r">
            <SelectCustomer
              selectedCustomer={selectedCustomer}
              setSelectedCustomer={setSelectedCustomer}
              setShowCreateForm={setShowCreateForm}
            />
          </div>

          <div className="w-[70%] flex flex-col h-full">
            {currentScreen === SCREEN.SERVICE_SELECTION && (
              <ServiceSelectionScreen employees={employees} />
            )}

            {currentScreen === SCREEN.CHECKOUT && (
              <CheckoutSection
                appointmentId={newAppointmentId}
                services={services}
                packages={packages}
                isExistingAppointment={false}
              />
            )}

            {currentScreen === SCREEN.SUMMARY && newAppointmentId && (
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-6">
                  Appointment Summary
                </h3>
                <SummaryView
                  appointmentId={newAppointmentId}
                />
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={handleCreateNewAppointment}
                  >
                    Create New Appointment
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
