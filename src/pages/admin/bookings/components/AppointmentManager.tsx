
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ServiceSelector } from './ServiceSelector';
import { CheckoutSection } from './CheckoutSection';
import { SelectCustomer } from '@/components/admin/bookings/components/SelectCustomer';
import { SummaryView } from './SummaryView';
import { Service, Package, Customer, SCREEN } from '../types';
import { useActiveServices } from '../hooks/useActiveServices';
import { useActivePackages } from '../hooks/useActivePackages';
import useSaveAppointment from '../hooks/useSaveAppointment';
import { useAppointmentState } from '../hooks/useAppointmentState';
import { calculateTotal, calculateDuration } from '../utils/bookingUtils';
import { CreateClientDialog } from '@/components/admin/bookings/components/CreateClientDialog';

interface AppointmentManagerProps {
  onClose: () => void;
  selectedDate?: Date;
  selectedTime?: string;
  employees: any[];
  existingAppointment?: any;
  onAppointmentCreated?: () => void;
  locationId: string;
}

export function AppointmentManager({
  onClose,
  selectedDate,
  selectedTime,
  employees,
  existingAppointment,
  onAppointmentCreated,
  locationId
}: AppointmentManagerProps) {
  const [activeScreen, setActiveScreen] = useState<SCREEN>(SCREEN.SERVICE_SELECTION);
  const [appointmentId, setAppointmentId] = useState<string | undefined>(existingAppointment?.id);
  const [appointmentDate, setAppointmentDate] = useState<Date>(selectedDate || new Date());
  const [appointmentTime, setAppointmentTime] = useState<string>(selectedTime || '09:00');
  const [discountType, setDiscountType] = useState<'none' | 'fixed' | 'percentage'>(
    existingAppointment?.discount_type || 'none'
  );
  const [discountValue, setDiscountValue] = useState<number>(
    existingAppointment?.discount_value || 0
  );
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>(
    existingAppointment?.payment_method || 'cash'
  );
  const [notes, setNotes] = useState<string>(existingAppointment?.notes || '');

  const appointmentState = useAppointmentState({
    initialDate: selectedDate,
    initialTime: selectedTime,
    initialAppointment: existingAppointment
  });
  
  const {
    selectedCustomer,
    setSelectedCustomer,
    showCreateForm,
    setShowCreateForm,
    selectedServices,
    setSelectedServices,
    selectedPackages,
    setSelectedPackages,
    selectedStylists,
    setSelectedStylists,
    customizedServices,
    setCustomizedServices
  } = appointmentState;

  const { data: services = [], isLoading: isLoadingServices } = useActiveServices(locationId);
  const { data: packages = [], isLoading: isLoadingPackages } = useActivePackages(locationId);
  const { saveAppointment, isLoading: isSaving } = useSaveAppointment();
  
  const isEditing = !!existingAppointment;

  const handleServiceSelect = (serviceId: string) => {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(selectedServices.filter(id => id !== serviceId));
      
      // Also remove stylist if one was selected
      const updatedStylists = { ...selectedStylists };
      delete updatedStylists[serviceId];
      setSelectedStylists(updatedStylists);
    } else {
      setSelectedServices([...selectedServices, serviceId]);
    }
  };

  const handlePackageSelect = (packageId: string) => {
    if (selectedPackages.includes(packageId)) {
      setSelectedPackages(selectedPackages.filter(id => id !== packageId));
      
      // Also remove stylist if one was selected
      const updatedStylists = { ...selectedStylists };
      delete updatedStylists[packageId];
      setSelectedStylists(updatedStylists);
    } else {
      setSelectedPackages([...selectedPackages, packageId]);
    }
  };

  const handleStylistSelect = (itemId: string, stylistId: string) => {
    setSelectedStylists({
      ...selectedStylists,
      [itemId]: stylistId
    });
  };

  const handleCustomPackage = (packageId: string, serviceId: string) => {
    setCustomizedServices(prev => {
      const currentServices = prev[packageId] || [];
      if (currentServices.includes(serviceId)) {
        return {
          ...prev,
          [packageId]: currentServices.filter(id => id !== serviceId)
        };
      } else {
        return {
          ...prev,
          [packageId]: [...currentServices, serviceId]
        };
      }
    });
  };

  const handleProceedToCheckout = () => {
    if (!selectedCustomer || (!selectedServices.length && !selectedPackages.length)) {
      return;
    }
    
    setActiveScreen(SCREEN.CHECKOUT);
  };

  const handleProceedToSummary = () => {
    setActiveScreen(SCREEN.SUMMARY);
  };

  const handleSaveAppointment = async () => {
    try {
      const totalPrice = calculateTotal(
        selectedServices,
        selectedPackages,
        services as Service[],
        packages as Package[],
        customizedServices
      );
      
      const totalDuration = calculateDuration(
        selectedServices,
        selectedPackages,
        services as Service[],
        packages as Package[],
        customizedServices
      );
      
      const result = await saveAppointment({
        appointmentId,
        customerId: selectedCustomer.id,
        date: appointmentDate,
        time: appointmentTime,
        services: selectedServices,
        packages: selectedPackages,
        stylists: selectedStylists,
        totalPrice,
        duration: totalDuration,
        discountType,
        discountValue: parseFloat(discountValue.toString()),
        paymentMethod,
        notes,
        status: 'confirmed',
        locationId
      });
      
      if (result.success) {
        if (onAppointmentCreated) {
          onAppointmentCreated();
        }
        onClose();
      }
    } catch (error) {
      console.error('Error saving appointment:', error);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Appointment' : 'New Appointment'}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeScreen} className="mt-6">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger 
              value={SCREEN.SERVICE_SELECTION} 
              onClick={() => setActiveScreen(SCREEN.SERVICE_SELECTION)}
            >
              1. Select Services
            </TabsTrigger>
            <TabsTrigger 
              value={SCREEN.CHECKOUT} 
              onClick={() => handleProceedToCheckout()}
              disabled={!selectedCustomer || (!selectedServices.length && !selectedPackages.length)}
            >
              2. Checkout
            </TabsTrigger>
            <TabsTrigger 
              value={SCREEN.SUMMARY} 
              onClick={() => handleProceedToSummary()}
              disabled={activeScreen !== SCREEN.CHECKOUT}
            >
              3. Summary
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={SCREEN.SERVICE_SELECTION} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <h3 className="text-lg font-medium mb-4">Select Customer</h3>
                <SelectCustomer
                  selectedCustomer={selectedCustomer}
                  onSelect={setSelectedCustomer}
                  onCreateNew={() => setShowCreateForm(true)}
                />
              </div>
              
              <div className="lg:col-span-2">
                <h3 className="text-lg font-medium mb-4">Select Services or Packages</h3>
                <ServiceSelector
                  onServiceSelect={handleServiceSelect}
                  onPackageSelect={handlePackageSelect}
                  onStylistSelect={handleStylistSelect}
                  selectedServices={selectedServices}
                  selectedPackages={selectedPackages}
                  stylists={employees}
                  selectedStylists={selectedStylists}
                  locationId={locationId}
                  onCustomPackage={handleCustomPackage}
                  customizedServices={customizedServices}
                />
                
                <div className="mt-6 flex justify-end">
                  <button
                    className="px-4 py-2 bg-primary text-white rounded-md disabled:opacity-50"
                    disabled={!selectedCustomer || (!selectedServices.length && !selectedPackages.length)}
                    onClick={handleProceedToCheckout}
                  >
                    Continue to Checkout
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value={SCREEN.CHECKOUT}>
            <CheckoutSection
              appointmentId={appointmentId}
              selectedCustomer={selectedCustomer}
              selectedServices={selectedServices}
              selectedPackages={selectedPackages}
              services={services as Service[]}
              packages={packages as Package[]}
              selectedStylists={selectedStylists}
              date={appointmentDate}
              setDate={setAppointmentDate}
              time={appointmentTime}
              setTime={setAppointmentTime}
              discountType={discountType}
              setDiscountType={setDiscountType}
              discountValue={discountValue}
              setDiscountValue={setDiscountValue}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              notes={notes}
              setNotes={setNotes}
              customizedServices={customizedServices}
              onPaymentComplete={() => {}}
              selectedTimeSlots={{}}
              onSaveAppointment={async () => ""}
              onRemoveService={() => {}}
              onRemovePackage={() => {}}
              onBackToServices={() => setActiveScreen(SCREEN.SERVICE_SELECTION)}
              locationId={locationId}
              onContinue={handleProceedToSummary}
              onDiscountTypeChange={setDiscountType}
              onDiscountValueChange={setDiscountValue}
              onPaymentMethodChange={(method) => setPaymentMethod(method as 'cash' | 'online')}
              onNotesChange={setNotes}
            />
          </TabsContent>
          
          <TabsContent value={SCREEN.SUMMARY}>
            <SummaryView
              appointmentId={appointmentId}
              customer={selectedCustomer}
              services={selectedServices.map(id => 
                services.find(s => s.id === id)
              ).filter(Boolean) as Service[]}
              packages={selectedPackages.map(id => 
                packages.find(p => p.id === id)
              ).filter(Boolean) as Package[]}
              stylists={selectedStylists}
              employees={employees}
              date={appointmentDate}
              time={appointmentTime}
              discountType={discountType}
              discountValue={discountValue}
              paymentMethod={paymentMethod}
              notes={notes}
              calculateTotal={() => calculateTotal(
                selectedServices,
                selectedPackages,
                services as Service[],
                packages as Package[],
                customizedServices
              )}
              customizedServices={customizedServices}
              isLoading={isSaving}
              onSave={handleSaveAppointment}
              onEdit={() => setActiveScreen(SCREEN.CHECKOUT)}
            />
          </TabsContent>
        </Tabs>
        
        {showCreateForm && (
          <CreateClientDialog
            open={showCreateForm}
            onSuccess={(newCustomer: Customer) => {
              setSelectedCustomer(newCustomer);
              setShowCreateForm(false);
            }}
            onClose={() => setShowCreateForm(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
