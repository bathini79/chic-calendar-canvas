import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SCREEN } from "../types";
import { SelectCustomer } from "./SelectCustomer";
import { ServiceSelection } from "./ServiceSelection";
import { CheckoutSection } from "./CheckoutSection";
import { SummaryView } from "./SummaryView";
import { useSaveAppointment } from "../hooks/useSaveAppointment";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { useAppointmentDetails } from "../hooks/useAppointmentDetails";
import { AppointmentStatus } from "../types";

export function AppointmentManager() {
  const [screen, setScreen] = useState<SCREEN>(SCREEN.SERVICE_SELECTION);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedStylists, setSelectedStylists] = useState<Record<string, string>>({});
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<Record<string, string>>({});
  const [customizedServices, setCustomizedServices] = useState<Record<string, string[]>>({});
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [locationId, setLocationId] = useState<string | undefined>(undefined);
  const [membershipDiscount, setMembershipDiscount] = useState<number>(0);
  const [membershipName, setMembershipName] = useState<string>("");

  const navigate = useNavigate();
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const isExistingAppointment = !!appointmentId;

  const { saveAppointment, isLoading: isSaving } = useSaveAppointment();
  const { fetchAppointmentDetails, isLoading: isFetchingAppointment } = useAppointmentDetails();

  useEffect(() => {
    if (appointmentId) {
      const fetchDetails = async () => {
        const details = await fetchAppointmentDetails(appointmentId);
        if (details) {
          setSelectedCustomer(details.customer);
          setLocationId(details.location);
          setDiscountType(details.discount_type);
          setDiscountValue(details.discount_value);
          setPaymentMethod(details.payment_method || 'cash');
          setNotes(details.notes || '');
          
          const serviceIds = details.bookings
            .filter(booking => booking.service_id)
            .map(booking => booking.service_id);
          setSelectedServices(serviceIds);
          
          const packageIds = details.bookings
            .filter(booking => booking.package_id)
            .map(booking => booking.package_id);
          setSelectedPackages(packageIds);
          
          const stylistSlots = {};
          details.bookings.forEach(booking => {
            stylistSlots[booking.service_id || booking.package_id] = booking.employee_id;
          });
          setSelectedStylists(stylistSlots);
          
          setScreen(SCREEN.CHECKOUT);
        } else {
          toast.error("Failed to load appointment details");
        }
      };
      
      fetchDetails();
    }
  }, [appointmentId, fetchAppointmentDetails]);

  const handleNext = useCallback(() => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }
    setScreen(SCREEN.SERVICE_SELECTION);
  }, [selectedCustomer]);

  const handleSaveAppointment = async (params: any = {}) => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return null;
    }

    const serviceItems = [];
    const packageItems = [];

    return await saveAppointment(
      selectedCustomer,
      serviceItems,
      packageItems,
      notes,
      discountType,
      discountValue,
      paymentMethod,
      totalDuration,
      params
    );
  };

  const handlePaymentComplete = (appointmentId: string) => {
    setScreen(SCREEN.SUMMARY);
  };

  const handleAddAnother = () => {
    navigate('/admin/bookings');
  };

  return (
    <div className="container h-full">
      <Card className="h-full">
        <CardContent className="h-full">
          {screen === SCREEN.SERVICE_SELECTION && !isExistingAppointment && (
            <SelectCustomer
              selectedCustomer={selectedCustomer}
              setSelectedCustomer={setSelectedCustomer}
              setShowCreateForm={setShowCreateForm}
            />
          )}
          {screen === SCREEN.SERVICE_SELECTION && !isExistingAppointment && (
            <Button onClick={handleNext}>Next</Button>
          )}
          {screen === SCREEN.SERVICE_SELECTION && isExistingAppointment && (
            <p>Loading Appointment Details...</p>
          )}
          {screen === SCREEN.SERVICE_SELECTION && isFetchingAppointment && (
            <p>Loading Appointment Details...</p>
          )}
          {screen === SCREEN.SERVICE_SELECTION && !isFetchingAppointment && isExistingAppointment && (
            <SelectCustomer
              selectedCustomer={selectedCustomer}
              setSelectedCustomer={setSelectedCustomer}
              setShowCreateForm={setShowCreateForm}
            />
          )}
          {screen === SCREEN.SERVICE_SELECTION && !isFetchingAppointment && isExistingAppointment && (
            <ServiceSelection
              selectedServices={selectedServices}
              selectedPackages={selectedPackages}
              selectedStylists={selectedStylists}
              selectedTimeSlots={selectedTimeSlots}
              customizedServices={customizedServices}
              setCustomizedServices={setCustomizedServices}
              onSaveAppointment={handleSaveAppointment}
              setScreen={setScreen}
              appointmentId={appointmentId}
              selectedCustomer={selectedCustomer}
              locationId={locationId}
            />
          )}
          {screen === SCREEN.CHECKOUT && (
            <CheckoutSection
              appointmentId={appointmentId}
              selectedCustomer={selectedCustomer}
              selectedServices={selectedServices}
              selectedPackages={selectedPackages}
              discountType={discountType}
              discountValue={discountValue}
              paymentMethod={paymentMethod}
              notes={notes}
              onDiscountTypeChange={setDiscountType}
              onDiscountValueChange={setDiscountValue}
              onPaymentMethodChange={setPaymentMethod}
              onNotesChange={setNotes}
              onPaymentComplete={handlePaymentComplete}
              selectedStylists={selectedStylists}
              selectedTimeSlots={selectedTimeSlots}
              onSaveAppointment={handleSaveAppointment}
              onRemoveService={(serviceId) =>
                setSelectedServices(
                  selectedServices.filter((id) => id !== serviceId)
                )
              }
              onRemovePackage={(packageId) =>
                setSelectedPackages(
                  selectedPackages.filter((id) => id !== packageId)
                )
              }
              onBackToServices={() => setScreen(SCREEN.SERVICE_SELECTION)}
              isExistingAppointment={isExistingAppointment}
              customizedServices={customizedServices}
              locationId={locationId}
            />
          )}
          {screen === SCREEN.SUMMARY && appointmentId && (
            <SummaryView 
              appointmentId={appointmentId}
              customer={{
                id: selectedCustomer?.id || "",
                full_name: selectedCustomer?.full_name || "",
                email: selectedCustomer?.email || "",
                phone_number: selectedCustomer?.phone_number
              }}
              totalPrice={totalPrice || 0}
              items={[]}
              paymentMethod={paymentMethod as 'cash' | 'card' | 'online'}
              onAddAnother={handleAddAnother}
              membershipDiscount={membershipDiscount}
              membershipName={membershipName}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
