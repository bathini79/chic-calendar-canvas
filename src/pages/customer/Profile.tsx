import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isPast } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Session } from "@supabase/supabase-js";
import { PopupWrapper } from "@/components/ui/PopupWrapper";
import { MapPin, ClipboardList, CheckCircle } from "lucide-react";

interface Appointment {
  id: string;
  customer_id: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  status: "pending" | "confirmed" | "canceled" | "completed" | "inprogress";
  number_of_bookings: number;
  total_price: number;
}

interface Booking {
  id: string;
  appointment_id: string;
  service_id: string | null;
  package_id: string | null;
  employee_id: string | null;
  status: string;
  service?: {
    id: string;
    name: string;
    selling_price: number;
    duration: number;
  } | null;
  package?: {
    id: string;
    name: string;
    price: number;
  } | null;
  employee?: {
    id: string;
    name: string;
  } | null;
}
// New Component: AppointmentCard
const AppointmentCard = ({
  appointment,
  onSelect,
}: {
  appointment: Appointment;
  onSelect: (appointment: Appointment) => void;
}) => {
  const formattedDate = format(
    new Date(appointment.start_time),
    "EEE, dd MMM, yyyy 'at' hh:mm a"
  );
  const duration = appointment.total_duration || 0;
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  const durationDisplay =
    hours > 0 ? `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}` : `${minutes}m`;
  return (
    <PopupWrapper
      popupContent={<AppointmentDetails appointment={appointment} />}
    >
      <Card className="mt-4 p-4 rounded-xl shadow-md hover:shadow-lg bg-white/80 backdrop-blur-md border border-gray-200 cursor-pointer transition-shadow">
        <div className="flex justify-between items-center">
          <p className="font-medium">{formattedDate}</p>
          <p className="font-bold text-lg">₹{appointment.total_price}</p>
        </div>
        <div className="flex gap-1  mt-2 text-sm text-gray-600">
          <span>{durationDisplay} </span> .
          <span>
            {appointment.number_of_bookings}{" "}
            {appointment.number_of_bookings > 1 ? "Bookings" : "Booking"}
          </span>
        </div>
      </Card>
    </PopupWrapper>
  );
};

function InfoRow({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={20} className="text-600" />
      <div>
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{subtitle}</p>
      </div>
    </div>
  );
}
// New Component: AppointmentDetails
const AppointmentDetails = ({ appointment }: { appointment: Appointment }) => {
  const { toast } = useToast();
  const fetchBookings = async (appointment_id: string) => {
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "*, service:service_id(*), package:package_id(*), employee:employee_id(*)"
      )
      .eq("appointment_id", appointment_id);
    console.log("data", data);
    if (error) {
      console.error("Error fetching bookings:", error);
      toast({
        variant: "destructive",
        title: "Error loading bookings",
        description: error.message,
      });
      throw new Error(error.message);
    }
    return data as Booking[];
  }; // Function to create the google maps url
  const createGoogleMapsUrl = (location?: Location) => {
    if (!location?.address) return ""; // Return an empty string if no address
    // Replace spaces with "+" for URL encoding
    const addressEncoded = location.address.replace(/ /g, "+");
    return `https://www.google.com/maps/search/?api=1&query=${addressEncoded}`;
  };

  // Fetch location data
  const { data: locationData } = useQuery<Location, Error>({
    queryKey: ["location"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select(`*, location_hours (*)`)
        .eq("status", "active")
        .single();

      if (error) {
        console.error("Error fetching location data:", error);
        throw error;
      }
      return data;
    },
  });
  const googleMapsUrl = createGoogleMapsUrl(locationData);

  const {
    data: bookings,
    isLoading: bookingsLoading,
    error: bookingsError,
    isError: bookingsIsError,
  } = useQuery<Booking[], Error>({
    queryKey: ["bookings", appointment?.id],
    queryFn: () => fetchBookings(appointment!.id),
    enabled: !!appointment?.id,
    refetchOnWindowFocus: false,
  });
  if (!appointment)
    return (
      <div className="mt-4 text-gray-600">
        Select an appointment to view details.
      </div>
    );
  if (bookingsLoading) {
    return <div className="mt-4">Loading Bookings</div>;
  }
  if (bookingsIsError) {
    return (
      <div className="mt-4">
        Error loading bookings : {bookingsError?.message}
      </div>
    );
  }
  const statusStyles = {
    pending: {
      style: "bg-yellow-200 text-yellow-800",
      label: "Pending Confirmation",
    },
    confirmed: { style: "bg-green-200 text-green-800", label: "Confirmed" },
    canceled: { style: "bg-red-200 text-red-800", label: "Canceled" },
    completed: { style: "bg-blue-200 text-blue-800", label: "Completed" },
    inprogress: {
      style: "bg-purple-200 text-purple-800",
      label: "In Progress",
    },
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours > 0 ? `${hours}h` : ""}${
      hours > 0 && mins > 0 ? ", " : ""
    }${mins > 0 ? `${mins}min` : ""}`;
  };
  return (
    <div className="space-y-6 p-6">
      <div
        className={`flex items-center gap-2 px-3 py-1 rounded-full w-fit text-sm font-semibold ${
          statusStyles[appointment.status]?.style || "bg-gray-200 text-gray-800"
        }`}
      >
        <CheckCircle size={18} />
        <span>
          {statusStyles[appointment.status]?.label || "Unknown Status"}
        </span>
      </div>
      <h2 className="text-2xl font-bold text-gray-900">
        {format(
          new Date(appointment.start_time),
          "EEE, dd MMM, yyyy 'at' hh:mm a"
        )}
      </h2>
      <p className="text-lg text-gray-700 font-medium">
        Total Cost: ₹{appointment.total_price}
      </p>

      <div className="mt-5 space-y-6">
        {locationData?.address && (
          <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
            <InfoRow
              icon={MapPin}
              title="Location Details"
              subtitle={locationData.address}
            />
          </a>
        )}
        <InfoRow
          icon={ClipboardList}
          title="Manage Appointment"
          subtitle="Reschedule or cancel"
        />
      </div>

      <div className="border-t border-gray-300 my-6"></div>
      <h3 className="text-lg font-semibold text-gray-900">Your Bookings</h3>
      <ul className="mt-3 space-y-4 text-gray-700">
        {bookings?.map((booking) => (
          <li
            key={booking.id}
            className="flex items-center justify-between bg-gray-100 p-4 rounded-lg text-sm"
          >
            {/* Left Section: Service Name & Duration */}
            <div className="flex flex-col w-1/2">
              <span className="font-medium text-gray-900">
                {booking.service?.name ||
                  booking.package?.name ||
                  "Service not specified"}
              </span>
              <span className="text-gray-500 text-xs">
                {formatDuration(booking.service?.duration)} with{" "}
                {booking.employee?.name || "Assigned Stylist"}
              </span>
            </div>
            {/* Right Section: Price */}
            <span className="text-gray-800 font-semibold w-1/4 text-right">
              ₹{booking.price_paid}
            </span>
          </li>
        ))}
      </ul>

      <Button className="w-full bg-black text-white font-semibold py-3 mt-6 rounded-xl hover:bg-gray-800 transition-all text-lg">
        Download Invoice
      </Button>
    </div>
  );
};

// New Component: AppointmentList
const AppointmentList = ({
  appointments,
  onSelect,
}: {
  appointments: Appointment[];
  onSelect: (appointment: Appointment) => void;
}) => {
  const upcomingAppointments = appointments.filter(
    (appointment) =>
      ["pending", "confirmed", "inprogress"].includes(appointment.status) &&
      !isPast(new Date(appointment.start_time))
  );

  const pastAppointments = appointments.filter(
    (appointment) =>
      ["completed", "canceled"].includes(appointment.status) ||
      isPast(new Date(appointment.start_time))
  );

  return (
    <div className="w-full">
      {/* Upcoming Section */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold flex items-center">
          Upcoming{" "}
          <span className="ml-2 bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs">
            {upcomingAppointments.length}
          </span>
        </h2>
        {upcomingAppointments.length > 0 ? (
          upcomingAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onSelect={onSelect}
            />
          ))
        ) : (
          <div className="mt-4 p-6 text-center border rounded-xl shadow-md bg-white/80 backdrop-blur-md border-gray-200">
            <p className="text-sm text-gray-600">No upcoming appointments.</p>
            <Button variant="default" className="mt-4">
              Book an appointment
            </Button>
          </div>
        )}
      </div>

      {/* Past Section */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold flex items-center">
          Past{" "}
          <span className="ml-2 bg-gray-400 text-white px-2 py-0.5 rounded-full text-xs">
            {pastAppointments.length}
          </span>
        </h2>
        {pastAppointments.length > 0 ? (
          pastAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onSelect={onSelect}
            />
          ))
        ) : (
          <div className="mt-4 p-6 text-center border rounded-xl shadow-md bg-white/80 backdrop-blur-md border-gray-200">
            <p className="text-sm text-gray-600">No past appointments.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Appointments() {
  const { toast } = useToast();
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  // Query for current user session
  const {
    data: session,
    isLoading: sessionLoading,
    isError: sessionIsError,
    error: sessionError,
  } = useQuery<Session | null, Error>({
    queryKey: ["session"],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session; // Could be null if not authenticated
    },
  });

  const fetchAppointments = async (customer_id: string) => {
    const { data, error: supabaseError } = await supabase
      .from("appointments")
      .select("*")
      .eq("customer_id", customer_id);

    if (supabaseError) {
      console.error("Error fetching appointments:", supabaseError);
      toast({
        variant: "destructive",
        title: "Error loading appointments",
        description: supabaseError.message,
      });
      throw new Error(supabaseError.message);
    }
    return data.map((appointment) => ({
      ...appointment,
      total_price: appointment.total_price,
    })) as Appointment[];
  };

  // Query for appointments
  const {
    data: appointments, // Changed to appointments
    isLoading: appointmentsLoading, // Changed to appointmentsLoading
    error: appointmentsError, // Changed to appointmentsError
    isError: appointmentsIsError, // Changed to appointmentsIsError
  } = useQuery<Appointment[], Error>({
    queryKey: ["appointments", session?.user?.id], // Changed queryKey
    queryFn: () => fetchAppointments(session!.user.id), // Changed function
    enabled: !!session?.user?.id && !sessionIsError,
    refetchOnWindowFocus: false,
  });

  // Handle session loading state
  if (sessionLoading) {
    return (
      <div className="p-6 max-w-lg mx-auto text-gray-900">
        Loading session...
      </div>
    );
  }

  // Handle session error state
  if (sessionIsError) {
    return (
      <div className="p-6 max-w-lg mx-auto text-gray-900">
        <h1 className="text-3xl font-bold mb-4">Appointments</h1>
        <p>Error loading session: {sessionError?.message}</p>
      </div>
    );
  }

  // If there is no user in session
  if (!session?.user) {
    return (
      <div className="p-6 max-w-lg mx-auto text-gray-900">
        <h1 className="text-3xl font-bold mb-4">Appointments</h1>
        <p>You are not logged in.</p>
      </div>
    );
  }

  // Handle appointments error state
  if (appointmentsIsError) {
    return (
      <div className="p-6 max-w-lg mx-auto text-gray-900">
        <h1 className="text-3xl font-bold mb-4">Appointments</h1>
        <p>Error loading appointments: {appointmentsError?.message}</p>
      </div>
    );
  }
  //Handle appointments loading
  if (appointmentsLoading) {
    return (
      <div className="p-6 max-w-lg mx-auto text-gray-900">
        Loading Appointments...
      </div>
    );
  }

  return (
    <div className="p-6 mx-auto text-gray-900">
      <h1 className="text-3xl font-bold mb-4">Appointments</h1>
      <div className="md:flex gap-6">
        <div className="md:w-1/2 w-full">
          <AppointmentList
            appointments={appointments}
            onSelect={setSelectedAppointment}
          />
        </div>
      </div>
      {selectedAppointment && (
        <div className="w-full">
          <AppointmentDetails appointment={selectedAppointment} />
        </div>
      )}
    </div>
  );
}
