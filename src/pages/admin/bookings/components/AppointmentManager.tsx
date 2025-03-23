import React, { useState, useEffect, useCallback, useMemo } from "react";
import { SCREEN } from "../types";
import { SelectCustomer } from "@/components/admin/bookings/components/SelectCustomer";
import { ServiceSelection } from "@/pages/admin/bookings/components/ServiceSelection";
import { CheckoutSection } from "./CheckoutSection";
import { SummaryView } from "./SummaryView";
import { useToast } from "@/components/ui/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { useSaveAppointment } from "../hooks/useSaveAppointment";

interface AppointmentManagerProps {
  appointmentId?: string;
  isExistingAppointment?: boolean;
  locationId?: string;
}

export const AppointmentManager: React.FC<AppointmentManagerProps> = ({
  appointmentId,
  isExistingAppointment,
  locationId
}) => {
  const [screen, setScreen] = useState<SCREEN>(SCREEN.SERVICE_SELECTION);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | 'card'>('cash');
  const [notes, setNotes] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [savedAppointmentId, setSavedAppointmentId] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [selectedStylists, setSelectedStylists] = useState<Record<string, string>>({});
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<Record<string, string>>({});
  const [customizedServices, setCustomizedServices] = useState<Record<string, string[]>>({});
  const { toast } = useToast();
  const { saveAppointment } = useSaveAppointment();

  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + item.price, 0);
  }, [items]);

  const taxAmount = 0; // Replace with actual tax calculation if needed
  const finalTotal = subtotal + taxAmount;

  const handleAddAnother = () => {
    setScreen(SCREEN.SERVICE_SELECTION);
    setSelectedServices([]);
    setSelectedPackages([]);
    setDiscountType('none');
    setDiscountValue(0);
    setNotes('');
    setReceiptNumber('');
    setSavedAppointmentId(null);
    setItems([]);
    setSelectedStylists({});
    setSelectedTimeSlots({});
    setCustomizedServices({});
  };

  useEffect(() => {
    if (selectedServices.length > 0 || selectedPackages.length > 0) {
      setScreen(SCREEN.CHECKOUT);
    }
  }, [selectedServices, selectedPackages]);

  const handleSaveAppointment = async (params?: any) => {
    try {
      if (!selectedCustomer) {
        toast({
          title: "Error",
          description: "Please select a customer",
          variant: "destructive",
        });
        return null;
      }

      const appointmentId = await saveAppointment({
        selectedCustomer,
        selectedServices,
        selectedPackages,
        discountType,
        discountValue,
        paymentMethod,
        notes,
        selectedStylists,
        selectedTimeSlots,
        existingAppointmentId: savedAppointmentId || appointmentId || null,
        customizedServices,
        locationId,
        params
      });

      if (appointmentId) {
        setSavedAppointmentId(appointmentId);
        setReceiptNumber(uuidv4().substring(0, 8).toUpperCase());
        setScreen(SCREEN.SUMMARY);
        return appointmentId;
      } else {
        toast({
          title: "Error",
          description: "Failed to save appointment",
          variant: "destructive",
        });
        return null;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save appointment",
        variant: "destructive",
      });
      return null;
    }
  };

  return (
    <div className="h-full w-full">
      {screen === SCREEN.SERVICE_SELECTION && (
        <ServiceSelection
          selectedCustomer={selectedCustomer}
          selectedServices={selectedServices}
          selectedPackages={selectedPackages}
          selectedStylists={selectedStylists}
          selectedTimeSlots={selectedTimeSlots}
          customizedServices={customizedServices}
          onSelectServices={(services) => {
            setSelectedServices(services);
          }}
          onSelectPackages={(packages) => {
            setSelectedPackages(packages);
          }}
          onSetItems={(items) => {
            setItems(items);
          }}
          onSetSelectedStylists={(stylists) => {
            setSelectedStylists(stylists);
          }}
          onSetSelectedTimeSlots={(timeSlots) => {
            setSelectedTimeSlots(timeSlots);
          }}
          onSetCustomizedServices={(customServices) => {
            setCustomizedServices(customServices);
          }}
        />
      )}

      {screen === SCREEN.CHECKOUT && (
        <CheckoutSection
          appointmentId={appointmentId}
          selectedCustomer={selectedCustomer}
          selectedServices={selectedServices}
          selectedPackages={selectedPackages}
          services={items.filter((item) => item.type === 'service')}
          packages={items.filter((item) => item.type === 'package')}
          discountType={discountType}
          discountValue={discountValue}
          paymentMethod={paymentMethod}
          notes={notes}
          onDiscountTypeChange={(type) => setDiscountType(type)}
          onDiscountValueChange={(value) => setDiscountValue(value)}
          onPaymentMethodChange={(method) => setPaymentMethod(method)}
          onNotesChange={(notes) => setNotes(notes)}
          onPaymentComplete={() => setScreen(SCREEN.SUMMARY)}
          selectedStylists={selectedStylists}
          selectedTimeSlots={selectedTimeSlots}
          onSaveAppointment={handleSaveAppointment}
          onRemoveService={(serviceId) => {
            setSelectedServices(selectedServices.filter((id) => id !== serviceId));
            setItems(items.filter((item) => item.id !== serviceId));
          }}
          onRemovePackage={(packageId) => {
            setSelectedPackages(selectedPackages.filter((id) => id !== packageId));
            setItems(items.filter((item) => item.id !== packageId));
          }}
          onBackToServices={() => setScreen(SCREEN.SERVICE_SELECTION)}
          isExistingAppointment={isExistingAppointment}
          customizedServices={customizedServices}
          locationId={locationId}
        />
      )}

      {screen === SCREEN.SUMMARY && savedAppointmentId && (
        <SummaryView
          appointmentId={savedAppointmentId}
          customer={{
            id: selectedCustomer!.id,
            full_name: selectedCustomer!.full_name || '',
            email: selectedCustomer!.email || '',
            phone_number: selectedCustomer!.phone_number
          }}
          totalPrice={finalTotal}
          items={items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            type: item.type,
            employee: item.stylist ? {
              id: item.stylist,
              name: item.stylistName || ''
            } : undefined,
            duration: item.duration
          }))}
          paymentMethod={paymentMethod}
          onAddAnother={handleAddAnother}
          receiptNumber={receiptNumber}
          taxAmount={taxAmount || 0}
          subTotal={subtotal}
        />
      )}

      {!selectedCustomer && screen === SCREEN.SERVICE_SELECTION && (
        <SelectCustomer
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          setShowCreateForm={() => { }}
        />
      )}
    </div>
  );
};
