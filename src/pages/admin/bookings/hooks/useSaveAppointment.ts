
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addMinutes } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { PaymentMethod, AppointmentStatus } from "../types";

interface SaveAppointmentProps {
  selectedDate: Date | null;
  selectedTime: string;
  selectedCustomer: any;
  selectedServices: string[];
  selectedPackages: string[];
  services: any[];
  packages: any[];
  selectedStylists: Record<string, string>;
  getTotalDuration: (services: any[], packages: any[]) => number;
  getTotalPrice: (services: any[], packages: any[], discountType: string, discountValue: number) => number;
  discountType: string;
  discountValue: number;
  paymentMethod: PaymentMethod;
  notes: string;
  customizedServices: Record<string, string[]>;
  currentScreen: string;
  locationId?: string;
  status?: AppointmentStatus;
}

const useSaveAppointment = ({
  selectedDate,
  selectedTime,
  selectedCustomer,
  selectedServices,
  selectedPackages,
  services,
  packages,
  selectedStylists,
  getTotalDuration,
  getTotalPrice,
  discountType,
  discountValue,
  paymentMethod,
  notes,
  customizedServices,
  currentScreen,
  locationId,
  status = "pending",
}: SaveAppointmentProps) => {
  
  const handleSaveAppointment = async (): Promise<string | null> => {
    if (!selectedCustomer || !selectedCustomer.id) {
      toast.error("Please select a customer");
      return null;
    }

    if (selectedServices.length === 0 && selectedPackages.length === 0) {
      toast.error("Please select at least one service or package");
      return null;
    }

    if (!selectedDate) {
      toast.error("Please select an appointment date");
      return null;
    }

    try {
      // Parse selected time
      const [hours, minutes] = selectedTime.split(':').map(Number);
      
      // Create appointment start date
      const startDate = new Date(selectedDate);
      startDate.setHours(hours, minutes, 0, 0);

      // Calculate total duration
      const totalDuration = getTotalDuration(services, packages);
      
      // Calculate appointment end time
      const endDate = addMinutes(startDate, totalDuration);
      
      // Generate appointment ID
      const appointmentId = uuidv4();
      
      // Calculate total price
      const totalPrice = getTotalPrice(services, packages, discountType, discountValue);
      
      // Create appointment record
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          id: appointmentId,
          customer_id: selectedCustomer.id,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          status: status, // Using the properly typed status
          total_price: totalPrice,
          discount_type: discountType,
          discount_value: discountValue,
          payment_method: paymentMethod,
          notes,
          location: locationId || null,
        })
        .select()
        .single();

      if (appointmentError) {
        throw appointmentError;
      }

      // Create bookings for each service
      for (const serviceId of selectedServices) {
        const service = services.find((s) => s.id === serviceId);
        if (service) {
          const stylistId = selectedStylists[serviceId] || null;
          await supabase.from('bookings').insert({
            appointment_id: appointmentId,
            service_id: serviceId,
            employee_id: stylistId,
            price_paid: service.selling_price,
            start_time: startDate.toISOString(),
            end_time: addMinutes(startDate, service.duration).toISOString(),
          });
        }
      }

      // Create bookings for each package and its associated services
      for (const packageId of selectedPackages) {
        const pkg = packages.find((p) => p.id === packageId);
        if (pkg) {
          const stylistId = selectedStylists[packageId] || null;
          
          // Book the package itself
          await supabase.from('bookings').insert({
            appointment_id: appointmentId,
            package_id: packageId,
            employee_id: stylistId,
            price_paid: pkg.price,
            start_time: startDate.toISOString(),
            end_time: addMinutes(startDate, pkg.duration).toISOString(),
          });

          // Book each service in the package
          if (pkg.package_services) {
            for (const ps of pkg.package_services) {
              await supabase.from('bookings').insert({
                appointment_id: appointmentId,
                service_id: ps.service.id,
                package_id: packageId,
                employee_id: stylistId,
                price_paid: ps.package_selling_price || ps.service.selling_price,
                start_time: startDate.toISOString(),
                end_time: addMinutes(startDate, ps.service.duration).toISOString(),
              });
            }
          }

          // Book any additional customized services for this package
          const extraServices = customizedServices[packageId] || [];
          for (const serviceId of extraServices) {
            const service = services.find(s => s.id === serviceId);
            if (service) {
              await supabase.from('bookings').insert({
                appointment_id: appointmentId,
                service_id: serviceId,
                package_id: packageId,
                employee_id: stylistId,
                price_paid: service.selling_price,
                start_time: startDate.toISOString(),
                end_time: addMinutes(startDate, service.duration).toISOString(),
              });
            }
          }
        }
      }

      const formattedDate = format(startDate, "MMMM d, yyyy");
      const formattedTime = format(startDate, "h:mm a");
      
      if (currentScreen === "checkout") {
        toast.success(`Payment completed successfully for appointment on ${formattedDate} at ${formattedTime}`);
      } else {
        toast.success(`Appointment booked successfully for ${formattedDate} at ${formattedTime}`);
      }

      return appointmentId;

    } catch (error: any) {
      console.error("Error saving appointment:", error);
      toast.error(`Failed to save appointment: ${error.message}`);
      return null;
    }
  };

  return { handleSaveAppointment };
};

export default useSaveAppointment;
