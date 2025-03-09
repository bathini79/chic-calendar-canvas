
import React, { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { supabase } from "@/integrations/supabase/client";
import { CalendarHeader } from "./bookings/components/CalendarHeader";
import { StatsPanel } from "./bookings/components/StatsPanel";
import { AppointmentDetailsDialog } from "./bookings/components/AppointmentDetailsDialog";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { formatTime, isSameDay, TOTAL_HOURS } from "./bookings/utils/timeUtils";
import { useActiveServices } from "./bookings/hooks/useActiveServices";
import { useActivePackages } from "./bookings/hooks/useActivePackages";
import { useAppointmentsByDate } from "./bookings/hooks/useAppointmentsByDate";
import { AppointmentWorkflowProvider } from "./bookings/context/AppointmentWorkflowContext";
import { AppointmentSidebar } from "./bookings/components/AppointmentSidebar";
import { Appointment } from "./bookings/types";
import TimeSlots from "@/components/admin/bookings/components/TimeSlots";

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();

  const { currentDate, nowPosition, goToday, goPrev, goNext } = useCalendarState();
  const { data: services } = useActiveServices();
  const { data: packages } = useActivePackages();
  const { data: appointments = [] } = useAppointmentsByDate(currentDate);

  const handleCheckoutFromAppointment = (appointment: Appointment) => {
    // Implementation will be handled by the AppointmentWorkflowProvider
    setSelectedAppointment(null);
    setIsAddAppointmentOpen(true);
  };

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("*")
          .eq("employment_type", "stylist");
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
  }, []);

  const openAddAppointment = () => {
    if (clickedCell) {
      const hours = Math.floor(clickedCell.time);
      const minutes = Math.round((clickedCell.time - hours) * 60);
      const timeString = `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;

      setSelectedDate(clickedCell.date);
      setSelectedTime(timeString);
    }
    setIsAddAppointmentOpen(true);
    setClickedCell(null);
  };

  const handleCellClick = (cell: { employeeId: string; time: number; x: number; y: number; date: Date }) => {
    setClickedCell(cell);
  };

  // This is a temporary function for the useCalendarState hook, will be replaced by the actual implementation
  function useCalendarState() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const nowPosition = currentDate.getHours() + currentDate.getMinutes() / 60;
    
    return {
      currentDate,
      nowPosition,
      goToday: () => setCurrentDate(new Date()),
      goPrev: () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 1);
        setCurrentDate(newDate);
      },
      goNext: () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 1);
        setCurrentDate(newDate);
      }
    };
  }

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
    <AppointmentWorkflowProvider services={services} packages={packages}>
      <DndProvider backend={HTML5Backend}>
        <div className="flex flex-col h-screen bg-gray-50 relative">
          <header className="p-4 border-b bg-white flex justify-between items-center">
            <div className="font-bold text-xl">Define Salon</div>
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
            open={!!selectedAppointment}
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

          <AppointmentSidebar 
            employees={employees}
            services={services || []}
            packages={packages || []}
          />
        </div>
      </DndProvider>
    </AppointmentWorkflowProvider>
  );
}
