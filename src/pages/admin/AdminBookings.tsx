
// Import and export the updated AdminBookings component
import React, { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { supabase } from "@/integrations/supabase/client";
import { CalendarHeader } from "./bookings/components/CalendarHeader";
import { StatsPanel } from "./bookings/components/StatsPanel";
import { CalendarIcon, MapPin } from "lucide-react";
import { format } from "date-fns";
import { formatTime, isSameDay, TOTAL_HOURS } from "./bookings/utils/timeUtils";
import { useCalendarState } from "./bookings/hooks/useCalendarState";
import TimeSlots from "@/components/admin/bookings/components/TimeSlots";
import { useAppointmentsByDate } from "./bookings/hooks/useAppointmentsByDate";
import { Appointment } from "./bookings/types";
import { AppointmentManager } from "./bookings/components/AppointmentManager";
import { AppointmentDetailsDialog } from "./bookings/components/AppointmentDetailsDialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

const initialStats = [
  { label: "Pending Confirmation", value: 0 },
  { label: "Upcoming Bookings", value: 11 },
  { label: "Today's Bookings", value: 5 },
  { label: "Today's Revenue", value: 1950 },
];

export default function AdminBookings() {
  const [employees, setEmployees] = useState([]);
  const [stats] = useState(initialStats);
  const [clickedCell, setClickedCell] = useState<{
    employeeId: string;
    time: number;
    x: number;
    y: number;
    date?: Date;
  } | null>(null);
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  const { currentDate, nowPosition, goToday, goPrev, goNext } =
    useCalendarState();
  const { data: appointments = [] } = useAppointmentsByDate(currentDate, selectedLocationId);
  
  // Fetch locations
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    // If no location is selected yet but we have locations, select the first one by default
    if (!selectedLocationId && locations.length > 0) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const query = supabase
          .from("employees")
          .select("*, employee_locations(location_id)")
          .eq("employment_type", "stylist");
        
        // Filter by location if one is selected
        if (selectedLocationId) {
          query.contains('employee_locations', [{ location_id: selectedLocationId }]);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        const employeeWithAvatar = data.map((employee) => ({
          ...employee,
          avatar: employee.name
            .split(" ")
            .map((n) => n[0])
            .join(""),
        }));
        setEmployees(employeeWithAvatar);
      } catch (error) {
        console.error("Error fetching employees:", error);
        setEmployees([]);
      }
    };

    fetchEmployees();
  }, [selectedLocationId]);

  const openAddAppointment = () => {
    if (clickedCell) {
      // Extract hours and minutes from the time value
      const hours = Math.floor(clickedCell.time);
      const minutes = Math.round((clickedCell.time - hours) * 60);
      
      // Format time as HH:MM
      const timeString = `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
      
      setAppointmentTime(timeString);
      setAppointmentDate(clickedCell.date || currentDate);
      setIsAddAppointmentOpen(true);
      setClickedCell(null);
    }
  };

  const closeAddAppointment = () => {
    setIsAddAppointmentOpen(false);
    setSelectedAppointment(null);
  };

  const handleCellClick = (cell: { employeeId: string; time: number; x: number; y: number; date: Date }) => {
    setClickedCell(cell);
  };

  const handleCheckoutFromAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    
    // Set the appointment date and time from the existing appointment
    const startDate = new Date(appointment.start_time);
    setAppointmentDate(startDate);
    setAppointmentTime(format(startDate, 'HH:mm'));
    
    setIsAddAppointmentOpen(true);
  };

  // This is a temporary prop for the TimeSlots component until we fix the imports
  const timeSlotsProps = {
    employees,
    formatTime,
    TOTAL_HOURS,
    currentDate,
    nowPosition,
    isSameDay,
    appointments,
    setSelectedAppointment,
    setClickedCell: handleCellClick,
    hourLabels: [],
    PIXELS_PER_HOUR: 60,
    handleColumnClick: () => {},
    renderAppointmentBlock: () => <></>
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-screen bg-gray-50 relative">
        <header className="p-4 border-b bg-white flex justify-between items-center">
          <div className="font-bold text-xl">Define Salon</div>
          
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <Select 
              value={selectedLocationId} 
              onValueChange={setSelectedLocationId}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(location => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>
        <StatsPanel stats={stats} />
        <CalendarHeader
          currentDate={currentDate}
          onToday={goToday}
          onPrevious={goPrev}
          onNext={goNext}
        />
        <TimeSlots
          {...timeSlotsProps}
        />
        
        <AppointmentDetailsDialog
          appointment={selectedAppointment}
          open={!!selectedAppointment && !isAddAppointmentOpen}
          onOpenChange={() => setSelectedAppointment(null)}
          onCheckout={handleCheckoutFromAppointment}
        />

        {clickedCell && (
          <div
            className="fixed z-50 w-48 rounded-lg shadow-lg border border-gray-200 overflow-hidden"
            style={{
              left: clickedCell.x,
              top: clickedCell.y,
            }}
          >
            <div className="bg-black px-4 py-2 text-sm font-medium text-white">
              {formatTime(clickedCell.time)}
            </div>
            <div
              className="bg-white px-4 py-3 flex items-center space-x-3 text-sm cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={openAddAppointment}
            >
              <CalendarIcon className="h-4 w-4 text-gray-600" />
              <span className="text-gray-700">Add Appointment</span>
            </div>
          </div>
        )}

        {isAddAppointmentOpen && appointmentDate && (
          <AppointmentManager
            isOpen={isAddAppointmentOpen}
            onClose={closeAddAppointment}
            selectedDate={appointmentDate}
            selectedTime={appointmentTime}
            employees={employees}
            existingAppointment={selectedAppointment}
            locationId={selectedLocationId}
          />
        )}
      </div>
    </DndProvider>
  );
}
