
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

const Profile = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAppointments();
  }, []);

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
          bookings (
            *,
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

  // Split appointments into upcoming and past
  const now = new Date();
  const upcomingAppointments = appointments.filter(
    (appointment) => new Date(appointment.start_time) >= now
  );
  const pastAppointments = appointments.filter(
    (appointment) => new Date(appointment.start_time) < now
  );

  if (selectedAppointment) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <AppointmentDetails 
          appointment={selectedAppointment} 
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
