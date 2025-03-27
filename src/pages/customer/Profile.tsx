
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { AppointmentCard } from "@/components/customer/appointments/AppointmentCard";
import { AppointmentDetails } from "@/components/customer/appointments/AppointmentDetails";
import { Button } from "@/components/ui/button";
import { Calendar, ClockIcon, ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Appointment {
  id: string;
  customer_id: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  status: string;
  total_price: number;
  bookings: Booking[];
  location: string | null;
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const navigate = useNavigate();

  const upcomingAppointments = appointments.filter(
    (appointment) => 
      new Date(appointment.start_time) > new Date() && 
      appointment.status !== "canceled"
  );
  
  const pastAppointments = appointments.filter(
    (appointment) => 
      new Date(appointment.start_time) <= new Date() || 
      appointment.status === "canceled"
  );

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

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDetailsOpen(true);
  };

  const handleBookAgain = () => {
    navigate('/schedule');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 h-[200px] flex items-center justify-center">
        <div className="animate-pulse">Loading appointments...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Appointments</h1>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past <span className="ml-1 text-xs rounded-full bg-muted px-2">{pastAppointments.length}</span></TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="space-y-4">
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-background">
              <div className="mx-auto w-16 h-16 mb-4 text-primary/60">
                <Calendar className="w-16 h-16 opacity-30" />
              </div>
              <h3 className="text-lg font-medium">No upcoming appointments</h3>
              <p className="text-muted-foreground mb-4">
                Your upcoming appointments will appear here when you book
              </p>
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={() => navigate('/schedule')}
              >
                Book an appointment
              </Button>
            </div>
          ) : (
            upcomingAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                id={appointment.id}
                status={appointment.status}
                date={appointment.start_time}
                locationName={location?.name || appointment.location || "Unknown Location"}
                bookings={appointment.bookings}
                totalPrice={appointment.total_price}
                onClick={() => handleAppointmentClick(appointment)}
                onRebook={handleBookAgain}
              />
            ))
          )}
        </TabsContent>
        
        <TabsContent value="past">
          {pastAppointments.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No past appointments found.</p>
            </div>
          ) : (
            pastAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                id={appointment.id}
                status={appointment.status}
                date={appointment.start_time}
                locationName={location?.name || appointment.location || "Unknown Location"}
                bookings={appointment.bookings}
                totalPrice={appointment.total_price}
                onClick={() => handleAppointmentClick(appointment)}
                onRebook={handleBookAgain}
                compact
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[525px] p-0">
          <div className="p-6">
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute left-4 top-4 p-0 h-auto mb-4"
              onClick={() => setDetailsOpen(false)}
            >
              <ArrowLeft className="h-5 w-5 mr-1" /> Back
            </Button>
            <div className="mt-8">
              <AppointmentDetails 
                appointment={selectedAppointment} 
                onBookAgain={handleBookAgain} 
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
