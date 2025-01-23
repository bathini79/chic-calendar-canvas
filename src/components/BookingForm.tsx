import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { CalendarDays, Clock, User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function BookingForm() {
  const { id: bookingId } = useParams();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [selectedEmployee, setSelectedEmployee] = useState<string>();

  // Fetch service details
  const { data: itemDetails } = useQuery({
    queryKey: ["service", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch available employees
  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
  });

  // Generate available time slots
  const getTimeSlots = () => {
    if (!selectedDate) return [];
    
    const slots = [];
    let hour = 9; // Start at 9 AM
    
    while (hour < 17) { // End at 5 PM
      for (let minute of [0, 30]) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
      hour++;
    }
    
    return slots;
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !selectedEmployee) {
      toast.error("Please select all required fields");
      return;
    }

    const startTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':');
    startTime.setHours(parseInt(hours), parseInt(minutes));

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + (itemDetails?.duration || 60));

    try {
      const { error } = await supabase.from("bookings").insert({
        customer_id: (await supabase.auth.getUser()).data.user?.id,
        service_id: bookingId,
        employee_id: selectedEmployee,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: "pending",
      });

      if (error) throw error;

      toast.success("Booking created successfully!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (!itemDetails) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">{itemDetails.name}</h1>
          <p className="text-muted-foreground">
            Duration: {itemDetails.duration} minutes
          </p>
          <p className="text-muted-foreground">
            Price: ₹{itemDetails.selling_price}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Select Date</h2>
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date() || date.getDay() === 0}
              className="rounded-md border"
            />
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Select Time</h2>
              </div>
              <Select onValueChange={setSelectedTime} value={selectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {getTimeSlots().map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Select Staff</h2>
              </div>
              <Select onValueChange={setSelectedEmployee} value={selectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button onClick={handleBooking}>
            Book Appointment
          </Button>
        </div>
      </Card>
    </div>
  );
}