import React, { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { supabase } from "@/integrations/supabase/client";
import { CalendarHeader } from "./bookings/components/CalendarHeader";
import { StatsPanel } from "./bookings/components/StatsPanel";
import { MapPin, Calendar as CalendarIcon, Plus, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { formatTime, formatTimeString, isSameDay } from "./bookings/utils/timeUtils";
import { useCalendarState } from "./bookings/hooks/useCalendarState";
import TimeSlots from "@/components/admin/bookings/components/TimeSlots";
import { useAppointmentsByDate } from "./bookings/hooks/useAppointmentsByDate";
import { AppointmentManager } from "./bookings/components/AppointmentManager";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Appointment, Employee, LocationHours } from "./bookings/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MembershipSale } from "@/components/admin/sales/MembershipSale";
import { useStaffSchedule } from "@/hooks/use-staff-schedule";

const initialStats = [
  { label: "Pending Confirmation", value: 0 },
  { label: "Upcoming Bookings", value: 11 },
  { label: "Today's Bookings", value: 5 },
  { label: "Today's Revenue", value: 1950 },
];

// Default business hours constants
const DEFAULT_START_HOUR = 8;
const DEFAULT_TOTAL_HOURS = 12;
const DEFAULT_PIXELS_PER_HOUR = 60;

export default function AdminBookings() {
  const queryClient = useQueryClient();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats] = useState(initialStats);
  const [clickedCell, setClickedCell] = useState<{
    employeeId: string;
    time: number;
    x: number;
    y: number;
    date?: Date;
  } | null>(null);
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false);
  const [isAddSaleOpen, setIsAddSaleOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [locationHours, setLocationHours] = useState<LocationHours[]>([]);
  const [businessHours, setBusinessHours] = useState({
    startHour: DEFAULT_START_HOUR,
    endHour: DEFAULT_START_HOUR + DEFAULT_TOTAL_HOURS,
    totalHours: DEFAULT_TOTAL_HOURS,
    pixelsPerHour: DEFAULT_PIXELS_PER_HOUR
  });

  const { currentDate, nowPosition, goToday, goPrev, goNext } =
    useCalendarState();
    
  const { data: appointmentsData = [], refetch: refetchAppointments } = useAppointmentsByDate(currentDate, selectedLocationId);
  const appointments = appointmentsData as unknown as Appointment[];
  
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

  const { data: businessDetails } = useQuery({
    queryKey: ['businessDetails'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_details")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch location hours when the location changes
  useEffect(() => {
    const fetchLocationHours = async () => {
      if (!selectedLocationId) return;
      
      try {
        const { data, error } = await supabase
          .from('location_hours')
          .select('*')
          .eq('location_id', selectedLocationId);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          setLocationHours(data as LocationHours[]);
          
          // Get today's business hours
          const today = currentDate;
          const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
          const todayHours = data.find(hours => hours.day_of_week === dayOfWeek);
          
          if (todayHours && !todayHours.is_closed) {
            // Parse the time strings into hours
            const startTimeParts = todayHours.start_time.split(':');
            const endTimeParts = todayHours.end_time.split(':');
            
            const startHourFromLocation = parseInt(startTimeParts[0], 10);
            const endHourFromLocation = parseInt(endTimeParts[0], 10) + (parseInt(endTimeParts[1], 10) > 0 ? 1 : 0);
            const totalHours = endHourFromLocation - startHourFromLocation;
            
            // Update the business hours state
            setBusinessHours({
              startHour: startHourFromLocation,
              endHour: endHourFromLocation,
              totalHours: totalHours,
              pixelsPerHour: DEFAULT_PIXELS_PER_HOUR
            });
          } else {
            // If the location is closed or no hours found, set to default
            setBusinessHours({
              startHour: DEFAULT_START_HOUR,
              endHour: DEFAULT_START_HOUR + DEFAULT_TOTAL_HOURS,
              totalHours: DEFAULT_TOTAL_HOURS,
              pixelsPerHour: DEFAULT_PIXELS_PER_HOUR
            });
          }
        }
      } catch (error) {
        console.error("Error fetching location hours:", error);
      }
    };
    
    fetchLocationHours();
  }, [selectedLocationId, currentDate]);

  useEffect(() => {
    if (!selectedLocationId && locations.length > 0) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        if (!selectedLocationId) {
          setEmployees([]);
          return;
        }
        
        // Get all employees with location filter and employment_type_permissions
        const { data, error } = await supabase
          .from("employees")
          .select(`
            *,
            employee_locations!inner(location_id),
            employment_types!inner(permissions)
          `)
          .eq("status", "active")
          .eq("employee_locations.location_id", selectedLocationId);
        
        if (error) throw error;
        
        // Filter employees to only those with perform_services permission
        let employeeList = data
          .filter(employee => {
            // Check if the employee has the perform_services permission
            const permissions = employee.employment_types?.permissions || [];
            return Array.isArray(permissions) && permissions.includes('perform_services');
          })
          .map((employee) => ({
            ...employee,
            avatar: employee.name
              .split(" ")
              .map((n) => n[0])
              .join(""),
            is_active: true,
            photo_url: employee.photo_url || null // Add missing property
          }));

        const defaultEmployeeName = `${businessDetails?.name || 'Salon'} Employee`;
        const defaultEmployee: Employee = {
          id: 'unassigned',
          name: defaultEmployeeName,
          avatar: defaultEmployeeName.split(" ").map(n => n[0]).join(""),
          email: '',
          employment_type: 'stylist',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          phone: '',
          is_active: true,
          photo_url: null // Add missing property
        };

        employeeList = [defaultEmployee, ...employeeList];
        setEmployees(employeeList);
      } catch (error) {
        console.error("Error fetching employees:", error);
        setEmployees([]);
      }
    };

    if (businessDetails) {
      fetchEmployees();
    }
  }, [selectedLocationId, businessDetails]);

  const openAddAppointment = () => {
    if (clickedCell) {
      // Extract hours and minutes from the time value
      const hours = Math.floor(clickedCell.time);
      const minutes = Math.round((clickedCell.time - hours) * 60);
      
      // Format as HH:MM
      const timeString = `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
      
      setAppointmentTime(timeString);
      setAppointmentDate(clickedCell.date || currentDate);
      setIsAddAppointmentOpen(true);
      setClickedCell(null);
    }
  };

  const openAddAppointmentFromButton = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    const timeString = `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
    
    setAppointmentTime(timeString);
    setAppointmentDate(currentDate);
    setIsAddAppointmentOpen(true);
  };

  const closeAddAppointment = () => {
    setIsAddAppointmentOpen(false);
    setSelectedAppointment(null);
    
    if (currentDate) {
      queryClient.invalidateQueries({ 
        queryKey: ['appointments', format(currentDate, 'yyyy-MM-dd'), selectedLocationId] 
      });
    }
  };

  const handleCellClick = (cell: { employeeId: string; time: number; x: number; y: number; date: Date }) => {
    setClickedCell(cell);
    
    // Extract hours and minutes from the time value
    const hours = Math.floor(cell.time);
    const minutes = Math.round((cell.time - hours) * 60);
    
    // Format as HH:MM
    const timeString = `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
    
    setAppointmentTime(timeString);
    setAppointmentDate(cell.date || currentDate);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    
    const startDate = new Date(appointment.start_time);
    setAppointmentDate(startDate);
    setAppointmentTime(format(startDate, 'HH:mm'));
    
    setIsAddAppointmentOpen(true);
  };

  // Generate the hour labels for the time slots
  const hourLabels = Array.from(
    { length: businessHours.totalHours }, 
    (_, i) => i + businessHours.startHour
  );

  const { scheduledStaffIds, isLoading: isLoadingSchedule } = useStaffSchedule({
    selectedDate: currentDate,
    locationId: selectedLocationId
  });
  
  // Filter employees to only show those scheduled for the selected date
  const scheduledEmployees = employees.filter(employee => 
    scheduledStaffIds.includes(employee.id)
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-screen bg-gray-50 relative">
        <header className="p-4 border-b bg-white flex justify-between items-center">          
          <div className="flex items-center space-x-4">
            {/* Calendar controls moved here */}
            <CalendarHeader
              currentDate={currentDate}
              onToday={goToday}
              onPrevious={goPrev}
              onNext={goNext}
              className="mr-2"
            />
            
            {/* Location selector */}
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
          </div>

          {/* Add button moved to right */}          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openAddAppointmentFromButton}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span>Add Appointment</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsAddSaleOpen(true)}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                <span>Add Sale</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <StatsPanel stats={stats} />
        
        <TimeSlots
          employees={scheduledEmployees}
          formatTime={formatTime}
          TOTAL_HOURS={businessHours.totalHours}
          currentDate={currentDate}
          nowPosition={nowPosition}
          isSameDay={isSameDay}
          appointments={appointments}
          setSelectedAppointment={handleAppointmentClick}
          setClickedCell={handleCellClick}
          hourLabels={hourLabels}
          PIXELS_PER_HOUR={businessHours.pixelsPerHour}
          handleColumnClick={() => {}}
          renderAppointmentBlock={() => null}
          isLoading={isLoadingSchedule} // Pass loading state to TimeSlots
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
            employees={scheduledEmployees.filter(emp => emp.id != "unassigned")}
            existingAppointment={selectedAppointment}
            locationId={selectedLocationId}
            onAppointmentSaved={() => {
              refetchAppointments();
            }}
          />
        )}

        <MembershipSale
          isOpen={isAddSaleOpen}
          onClose={() => setIsAddSaleOpen(false)}
          locationId={selectedLocationId}
        />
      </div>
    </DndProvider>
  );
}
