import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { AppointmentCard } from "@/components/customer/appointments/AppointmentCard";
import { AppointmentDetails } from "@/components/customer/appointments/AppointmentDetails";
import { EmptyAppointments } from "@/components/customer/appointments/EmptyAppointments";

interface Appointment {
  id: string;
  customer_id: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  status: string;
  total_price: number;
  bookings: Booking[];
  location?: string;
  location_id?: string;
  subtotal?: number;
  tax_amount?: number;
  tax_id?: string;
  tax_name?: string;
  membership_name?: string;
  membership_discount?: number;
  coupon_code?: string;
  coupon_discount?: number;
  points_redeemed?: number;
  points_value?: number;
  round_off_difference?: number;
  payment_method?: string;
}

interface Booking {
  id: string;
  service_id: string | null;
  package_id: string | null;
  employee_id: string;
  start_time: string;
  end_time: string;
  price_paid: number;
  service: Service | null;
  package: Package | null;
  employee: Employee | null;
  original_price?: number;
}

interface Service {
  id: string;
  name: string;
  duration: number;
}

interface Package {
  id: string;
  name: string;
  duration: number;
}

interface Employee {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
}

const Profile = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [locations, setLocations] = useState<Record<string, Location>>({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchAppointments();
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, address, city, state, zip_code');
      
      if (error) throw error;
      
      const locationsMap: Record<string, Location> = {};
      data?.forEach((location: Location) => {
        locationsMap[location.id] = location;
      });
      
      setLocations(locationsMap);
    } catch (error: any) {
      console.error("Error fetching locations:", error.message);
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase.auth.getUser();
      const customerId = profile.user?.id;

      if (!customerId) {
        toast.error("Could not get user ID.");
        setLoading(false);
        return;
      }

      const { data: appointmentsData, error } = await supabase
        .from('appointments')
        .select(`
          *,
          subtotal,
          tax_amount,
          tax_id,
          tax_name,
          membership_name,
          membership_discount,
          coupon_code,
          coupon_discount,
          points_redeemed,
          points_value,
          round_off_difference,
          payment_method,
          bookings (
            *,
            original_price,
            price_paid,
            service:services (*),
            package:packages (*),
            employee:employees!bookings_employee_id_fkey(*)
          )
        `)
        .eq('customer_id', customerId)
        .order('start_time', { ascending: true });

      if (error) {
        throw error;
      }
      setAppointments(appointmentsData || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRescheduleAppointment = (appointmentId: string) => {
    navigate("/schedule", { state: { appointmentId } });
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'canceled' })
        .eq('id', appointmentId);

      if (error) {
        throw error;
      }

      // Update the appointment status in the local state
      setAppointments(prevAppointments => 
        prevAppointments.map(app => 
          app.id === appointmentId 
            ? { ...app, status: 'canceled' } 
            : app
        )
      );

      if (selectedAppointment?.id === appointmentId) {
        setSelectedAppointment(prev => prev ? { ...prev, status: 'canceled' } : null);
      }

      toast.success("Appointment cancelled successfully");
    } catch (error: any) {
      toast.error(`Failed to cancel appointment: ${error.message}`);
    }
  };

  // Helper function to get location name from ID
  const getLocationName = (locationId: string) => {
    if (!locationId) return "Not specified";
    
    const location = locations[locationId];
    if (!location) return "Not specified";
    
    return location.name;
  };

  // Helper function to get formatted location address
  const getFormattedAddress = (locationId: string) => {
    if (!locationId) return "Not specified";
    
    const location = locations[locationId];
    if (!location) return "Not specified";
    
    const addressParts = [];
    if (location.name) addressParts.push(location.name);
    if (location.address) addressParts.push(location.address);
    if (location.city) addressParts.push(location.city);
    if (location.state) addressParts.push(location.state);
    if (location.zip_code) addressParts.push(location.zip_code);
    
    return addressParts.join("\n");
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading your appointments...</p>
        </div>
      </div>
    );
  }

  // Process appointments to add location names for cards
  const processedAppointmentsForCards = appointments.map(appointment => ({
    ...appointment,
    locationName: getLocationName(appointment.location || "")
  }));

  // Split appointments into upcoming and past
  const now = new Date();
  const upcomingAppointments = processedAppointmentsForCards.filter(
    (appointment) => new Date(appointment.start_time) >= now
  );
  const pastAppointments = processedAppointmentsForCards.filter(
    (appointment) => new Date(appointment.start_time) < now
  );

  if (selectedAppointment) {
    // Process the selected appointment to include full location details for the appointment details view
    const processedSelectedAppointment = {
      ...selectedAppointment,
      locationAddress: getFormattedAddress(selectedAppointment?.location || "")
    };

    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <AppointmentDetails 
          appointment={processedSelectedAppointment} 
          onBack={() => setSelectedAppointment(null)} 
          onReschedule={handleRescheduleAppointment}
          onCancel={handleCancelAppointment}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Appointments</h1>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Upcoming Appointments</h2>
          {upcomingAppointments.length === 0 ? (
            <EmptyAppointments type="upcoming" />
          ) : (
            <div>
              {upcomingAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onClick={() => setSelectedAppointment(appointment)}
                  onReschedule={handleRescheduleAppointment}
                  onCancel={handleCancelAppointment}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Past Appointments</h2>
          {pastAppointments.length === 0 ? (
            <EmptyAppointments type="past" />
          ) : (
            <div>
              {pastAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onClick={() => setSelectedAppointment(appointment)}
                  isPast={true}
                  onReschedule={handleRescheduleAppointment}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
