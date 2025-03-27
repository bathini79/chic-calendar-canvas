
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface LocationData {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: string;
}

const Profile = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
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
          .order('start_time', { ascending: false });

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

    fetchAppointments();
  }, []);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const { data: locations, error } = await supabase
          .from('locations')
          .select('*')
          .limit(1);

        if (error) {
          throw error;
        }

        if (locations && locations.length > 0) {
          const locationData: LocationData = {
            id: locations[0].id,
            name: locations[0].name,
            address: locations[0].address || undefined,
            phone: locations[0].phone || undefined,
            email: locations[0].email || undefined,
            status: locations[0].status || undefined,
          };
          setLocation(locationData);
        }
      } catch (error: any) {
        toast.error(error.message);
      }
    };

    fetchLocation();
  }, []);

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
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Appointments</h1>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">
            Past
            {pastAppointments.length > 0 && (
              <span className="ml-2 bg-muted text-muted-foreground rounded-full px-2 py-1 text-xs">
                {pastAppointments.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-0">
          {upcomingAppointments.length === 0 ? (
            <EmptyAppointments type="upcoming" />
          ) : (
            <div>
              {upcomingAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onClick={() => setSelectedAppointment(appointment)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-0">
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
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
