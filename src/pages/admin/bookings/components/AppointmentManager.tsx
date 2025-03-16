
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Appointment, SCREEN, Service, Package } from "../types";
import { toast } from "sonner";
import { ServiceSelector } from "./ServiceSelector";
import { TimeSlots } from "@/components/admin/bookings/components/TimeSlots";
import { CheckoutSection } from "./CheckoutSection";
import { AppointmentUtils } from "../utils/bookingUtils";
import { SummaryView } from "./SummaryView";
import { SelectCustomer } from "@/components/admin/bookings/components/SelectCustomer";
import { ArrowLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAppointmentState } from "../hooks/useAppointmentState";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useSaveAppointment } from "../hooks/useSaveAppointment";
import { useActiveServices } from "../hooks/useActiveServices";
import { useActivePackages } from "../hooks/useActivePackages";
import { supabase } from "@/integrations/supabase/client";

interface AppointmentManagerProps {
  date: Date;
  appointmentId?: string;
  onClose: () => void;
  locationId: string;
}

export const AppointmentManager = ({
  date,
  appointmentId,
  onClose,
  locationId,
}: AppointmentManagerProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [screen, setScreen] = useState<SCREEN>(SCREEN.SERVICE_SELECTION);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [locationHours, setLocationHours] = useState({ start: "09:00", end: "21:00" });
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");

  const {
    state: {
      selectedCustomer,
      selectedServices,
      selectedPackages,
      selectedStylists,
      customizedServices,
      notepad,
      discountType,
      discountValue,
    },
    actions: {
      setSelectedCustomer,
      addSelectedService,
      removeSelectedService,
      addSelectedPackage,
      removeSelectedPackage,
      setSelectedStylist,
      toggleCustomPackageService,
      setNotepad,
      setDiscountType,
      setDiscountValue,
      resetState,
    },
  } = useAppointmentState();

  const { data: services = [], isLoading: servicesLoading } = useActiveServices(locationId);
  const { data: packages = [], isLoading: packagesLoading } = useActivePackages(locationId);
  const { saveAppointment } = useSaveAppointment();

  // Fetch stylists based on location
  const { data: stylists = [], isLoading: stylistsLoading } = useQuery({
    queryKey: ["stylists", locationId],
    queryFn: async () => {
      // First get all employees assigned to this location
      const { data: locationEmployees, error: locationError } = await supabase
        .from('employee_locations')
        .select('employee_id')
        .eq('location_id', locationId);
      
      if (locationError) throw locationError;
      
      if (!locationEmployees || locationEmployees.length === 0) {
        // If no employees assigned to this location, return empty array
        return [];
      }
      
      // Get the employee IDs
      const employeeIds = locationEmployees.map(le => le.employee_id);
      
      // Then fetch the actual employee data
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .in('id', employeeIds)
        .eq('status', 'active')
        .eq('employment_type', 'stylist');
      
      if (employeesError) throw employeesError;
      
      return employees || [];
    },
  });

  // Fetch location's operating hours
  useEffect(() => {
    const fetchLocationHours = async () => {
      if (!locationId) return;
      
      try {
        const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday, etc.
        
        const { data, error } = await supabase
          .from('location_hours')
          .select('*')
          .eq('location_id', locationId)
          .eq('day_of_week', dayOfWeek)
          .single();
        
        if (error) {
          console.error('Error fetching location hours:', error);
          return;
        }
        
        if (data) {
          setLocationHours({
            start: data.start_time,
            end: data.end_time,
          });
        }
      } catch (error) {
        console.error('Failed to fetch location hours:', error);
      }
    };
    
    fetchLocationHours();
  }, [locationId, date]);

  // Fetch appointment details if editing
  useEffect(() => {
    const fetchAppointment = async () => {
      if (!appointmentId) return;
      
      try {
        const { data: appointment, error } = await supabase
          .from('appointments')
          .select(`
            *,
            customer:profiles(*),
            bookings(
              *,
              service:services(*),
              package:packages(*),
              employee:employees(*)
            )
          `)
          .eq('id', appointmentId)
          .single();
        
        if (error) throw error;
        
        if (appointment) {
          // Set appointment data
          setSelectedCustomer(appointment.customer);
          
          // Set services, packages and stylists
          const newSelectedServices: string[] = [];
          const newSelectedPackages: string[] = [];
          const newSelectedStylists: Record<string, string> = {};
          
          appointment.bookings.forEach((booking: any) => {
            if (booking.service_id) {
              newSelectedServices.push(booking.service_id);
              if (booking.employee_id) {
                newSelectedStylists[booking.service_id] = booking.employee_id;
              }
            }
            
            if (booking.package_id) {
              newSelectedPackages.push(booking.package_id);
              if (booking.employee_id) {
                newSelectedStylists[booking.package_id] = booking.employee_id;
              }
            }
          });
          
          // Set selected time
          const appointmentDate = new Date(appointment.start_time);
          setSelectedTime(format(appointmentDate, 'HH:mm'));
          
          // Set discount
          setDiscountType(appointment.discount_type as any);
          setDiscountValue(appointment.discount_value);
          
          // Set notepad
          if (appointment.notes) {
            setNotepad(appointment.notes);
          }
          
          // Set payment method
          setPaymentMethod(appointment.payment_method as "cash" | "online");
        }
      } catch (error) {
        console.error("Error fetching appointment:", error);
        toast.error("Failed to load appointment details");
      }
    };
    
    fetchAppointment();
  }, [appointmentId]);

  const calculateTotalDuration = (selectedServices: string[], selectedPackages: string[], services: Service[], packages: Package[], customizedServices?: Record<string, string[]>) => {
    return AppointmentUtils.calculateTotalDuration(selectedServices, selectedPackages, services, packages, customizedServices);
  };
  
  const calculateTotalPrice = (selectedServices: string[], selectedPackages: string[], services: Service[], packages: Package[], customizedServices?: Record<string, string[]>) => {
    return AppointmentUtils.calculateTotalPrice(selectedServices, selectedPackages, services, packages, customizedServices);
  };
  
  const calculateDiscountedTotal = (selectedServices: string[], selectedPackages: string[], services: Service[], packages: Package[], discountType: string, discountValue: number, customizedServices?: Record<string, string[]>) => {
    return AppointmentUtils.calculateDiscountedTotal(selectedServices, selectedPackages, services, packages, discountType, discountValue, customizedServices);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleServiceSelect = (serviceId: string) => {
    if (selectedServices.includes(serviceId)) {
      removeSelectedService(serviceId);
    } else {
      addSelectedService(serviceId);
    }
  };

  const handlePackageSelect = (packageId: string) => {
    if (selectedPackages.includes(packageId)) {
      removeSelectedPackage(packageId);
    } else {
      addSelectedPackage(packageId);
    }
  };

  const handleStylistSelect = (itemId: string, stylistId: string) => {
    setSelectedStylist(itemId, stylistId === "any" ? "" : stylistId);
  };

  const handleCustomizePackage = (packageId: string, serviceId: string) => {
    toggleCustomPackageService(packageId, serviceId);
  };

  const handleSave = async () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    if (selectedServices.length === 0 && selectedPackages.length === 0) {
      toast.error("Please select at least one service or package");
      return;
    }

    if (!selectedTime) {
      toast.error("Please select an appointment time");
      return;
    }

    try {
      setIsSaving(true);

      const result = await saveAppointment({
        appointmentId,
        customer: selectedCustomer,
        services: selectedServices,
        packages: selectedPackages,
        stylists: selectedStylists,
        customizedServices,
        date,
        time: selectedTime,
        discountType,
        discountValue,
        notes: notepad,
        location: locationId,
        paymentMethod: paymentMethod
      });

      setIsSaving(false);

      if (result) {
        toast.success(
          appointmentId 
            ? "Appointment updated successfully" 
            : "Appointment created successfully"
        );
        
        // Clear state and refresh data
        resetState();
        queryClient.invalidateQueries({ queryKey: ["appointments"] });
        
        if (appointmentId) {
          setScreen(SCREEN.SUMMARY);
        } else {
          onClose();
        }
      }
    } catch (error: any) {
      setIsSaving(false);
      toast.error(error.message || "Failed to save appointment");
    }
  };

  const handleBack = () => {
    if (screen === SCREEN.CHECKOUT) {
      setScreen(SCREEN.SERVICE_SELECTION);
    } else if (screen === SCREEN.SUMMARY) {
      setScreen(SCREEN.CHECKOUT);
    }
  };

  const totalServicePrice = calculateTotalPrice(selectedServices, selectedPackages, services as Service[], packages as Package[], customizedServices);
  const totalDiscountedPrice = calculateDiscountedTotal(selectedServices, selectedPackages, services as Service[], packages as Package[], discountType, discountValue, customizedServices);
  const totalDuration = calculateTotalDuration(selectedServices, selectedPackages, services as Service[], packages as Package[], customizedServices);

  // Loading state
  if (servicesLoading || packagesLoading || stylistsLoading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {screen !== SCREEN.SERVICE_SELECTION && (
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={handleBack}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      )}

      <div className="flex-1 py-4">
        {screen === SCREEN.SERVICE_SELECTION && (
          <div className="space-y-6">
            <SelectCustomer
              selectedCustomer={selectedCustomer}
              onSelectCustomer={setSelectedCustomer}
            />
            
            <Separator className="my-4" />

            <ServiceSelector
              onServiceSelect={handleServiceSelect}
              onPackageSelect={handlePackageSelect}
              onStylistSelect={handleStylistSelect}
              selectedServices={selectedServices}
              selectedPackages={selectedPackages}
              selectedStylists={selectedStylists}
              stylists={stylists}
              onCustomPackage={handleCustomizePackage}
              customizedServices={customizedServices}
              locationId={locationId}
            />
          </div>
        )}

        {screen === SCREEN.CHECKOUT && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">
              {appointmentId ? "Update Appointment" : "Create Appointment"}
            </h2>
            
            <TimeSlots
              date={date}
              services={services as Service[]}
              packages={packages as Package[]}
              selectedServices={selectedServices}
              selectedPackages={selectedPackages}
              availableStylists={stylists}
              selectedStylists={selectedStylists}
              onTimeSelect={handleTimeSelect}
              customizedServices={customizedServices}
              openingHours={locationHours}
              locationId={locationId}
            />
            
            <CheckoutSection
              appointmentId={appointmentId}
              selectedCustomer={selectedCustomer}
              selectedServices={selectedServices}
              selectedPackages={selectedPackages}
              services={services as Service[]}
              packages={packages as Package[]}
              stylists={stylists}
              selectedStylists={selectedStylists}
              customizedServices={customizedServices}
              selectedTime={selectedTime}
              date={date}
              totalPrice={totalServicePrice}
              discountedTotal={totalDiscountedPrice}
              discountType={discountType}
              discountValue={discountValue}
              onDiscountTypeChange={setDiscountType}
              onDiscountValueChange={setDiscountValue}
              notepad={notepad}
              onNotepadChange={setNotepad}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={(method) => setPaymentMethod(method as "cash" | "online")}
              locationId={locationId}
            />
          </div>
        )}

        {screen === SCREEN.SUMMARY && appointmentId && (
          <SummaryView appointmentId={appointmentId} />
        )}
      </div>

      <div className="border-t pt-4 mt-auto">
        <div className="flex items-center justify-between">
          <div>
            {selectedServices.length > 0 || selectedPackages.length > 0 ? (
              <div className="text-sm">
                <span className="font-medium">
                  {totalDuration} mins · ₹{totalDiscountedPrice}
                </span>
              </div>
            ) : null}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            
            {screen === SCREEN.SERVICE_SELECTION && (
              <Button 
                onClick={() => setScreen(SCREEN.CHECKOUT)}
                disabled={
                  (selectedServices.length === 0 && selectedPackages.length === 0) ||
                  !selectedCustomer
                }
              >
                Next
              </Button>
            )}
            
            {screen === SCREEN.CHECKOUT && (
              <Button 
                onClick={handleSave}
                disabled={
                  !selectedTime || 
                  isSaving ||
                  (selectedServices.length === 0 && selectedPackages.length === 0) ||
                  !selectedCustomer
                }
              >
                {isSaving 
                  ? "Saving..." 
                  : appointmentId 
                    ? "Update Appointment" 
                    : "Book Appointment"
                }
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
