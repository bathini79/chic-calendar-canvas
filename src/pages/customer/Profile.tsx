import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { enUS } from 'date-fns/locale';

interface Appointment {
  id: string;
  customer_id: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  status: string;
  total_price: number;
  bookings: Booking[];
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

interface AppointmentDisplayProps {
  appointment: Appointment;
  totalDuration: string; // Changed from durationDisplay
}

const AppointmentDisplay: React.FC<AppointmentDisplayProps> = ({ 
  appointment,
  totalDuration, // Changed from durationDisplay
}) => {
  return (
    <div>
      <p>Total Duration: {totalDuration}</p>
    </div>
  );
};

const Profile = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<LocationData | null>(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const { data: profile } = await supabase.auth.getUser()
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
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Your Appointments</h1>

      {appointments.length === 0 ? (
        <p>No appointments found.</p>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => {
            const totalDurationMinutes = appointment.bookings.reduce((total, booking) => {
              return total + (booking.service?.duration || booking.package?.duration || 0);
            }, 0);

            const hours = Math.floor(totalDurationMinutes / 60);
            const minutes = totalDurationMinutes % 60;
            const durationDisplay = `${hours}h ${minutes}m`;

            return (
              <div key={appointment.id} className="border rounded p-4">
                <h2 className="text-lg font-semibold">
                  Appointment on {format(new Date(appointment.start_time), 'MMMM dd, yyyy')}
                </h2>
                <p>
                  {format(new Date(appointment.start_time), 'h:mm a')} -{' '}
                  {format(new Date(appointment.end_time), 'h:mm a')}
                </p>
                <p>
                  {formatDistanceToNow(new Date(appointment.start_time), {
                    addSuffix: true,
                    locale: enUS,
                  })}
                </p>
                <p>Status: {appointment.status}</p>
                <p>Total Price: ${appointment.total_price}</p>
                <AppointmentDisplay appointment={appointment} totalDuration={durationDisplay} />

                <h3 className="text-md font-semibold mt-2">Bookings:</h3>
                {appointment.bookings.map((booking) => (
                  <div key={booking.id} className="ml-4">
                    <p>
                      {booking.service
                        ? `Service: ${booking.service.name} (${booking.service.duration} minutes)`
                        : `Package: ${booking.package?.name} (${booking.package?.duration} minutes)`}
                    </p>
                    {booking.employee && <p>Employee: {booking.employee.name}</p>}
                    <p>Price Paid: ${booking.price_paid}</p>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <h2 className="text-xl font-bold mt-8">Our Location</h2>
      {location ? (
        <div>
          <p>Name: {location.name}</p>
          <p>Address: {location.address}</p>
          <p>Phone: {location.phone}</p>
          <p>Email: {location.email}</p>
          <p>Status: {location.status}</p>
        </div>
      ) : (
        <p>No location information found.</p>
      )}
    </div>
  );
};

export default Profile;
