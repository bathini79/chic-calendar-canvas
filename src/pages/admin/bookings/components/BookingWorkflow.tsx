
import React from 'react';
import { BookingProvider } from '../context/BookingContext';
import { ServiceSelectionScreen } from './ServiceSelectionScreen';
import { CheckoutScreen } from './CheckoutScreen';
import { SummaryScreen } from './SummaryScreen';
import { SelectCustomer } from '@/components/admin/bookings/components/SelectCustomer';
import { useBooking } from '../context/BookingContext';
import { Service, Package, SCREEN } from '../types';

interface BookingScreensProps {
  services: Service[] | undefined;
  packages: Package[] | undefined;
  employees: any[];
  onClose: () => void;
}

// This component manages the screens based on the current screen state
const BookingScreens: React.FC = () => {
  const { currentScreen, selectedCustomer, setSelectedCustomer, setShowCreateForm } = useBooking();

  return (
    <div className="flex flex-1 min-h-0">
      <div className="w-[30%] border-r">
        <SelectCustomer
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          setShowCreateForm={setShowCreateForm}
        />
      </div>

      <div className="w-[70%] flex flex-col h-full">
        {currentScreen === SCREEN.SERVICE_SELECTION && <ServiceSelectionScreen />}
        {currentScreen === SCREEN.CHECKOUT && <CheckoutScreen />}
        {currentScreen === SCREEN.SUMMARY && <SummaryScreen />}
      </div>
    </div>
  );
};

export const BookingWorkflow: React.FC<BookingScreensProps> = ({
  services,
  packages,
  employees,
  onClose
}) => {
  return (
    <BookingProvider 
      services={services} 
      packages={packages} 
      onClose={onClose}
    >
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
        </div>

        <BookingScreens />
      </div>
    </BookingProvider>
  );
};
