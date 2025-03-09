
import React, { useState, useEffect } from "react";
import { HTML5Backend } from "react-dnd-html5-backend";
import { supabase } from "@/integrations/supabase/client";
import { CalendarHeader } from "./bookings/components/CalendarHeader";
import { StatsPanel } from "./bookings/components/StatsPanel";
import { AppointmentDetailsDialog } from "./bookings/components/AppointmentDetailsDialog";
import { format } from "date-fns";
import { formatTime, isSameDay, TOTAL_HOURS } from "./bookings/utils/timeUtils";
import { useCalendarState } from "./bookings/hooks/useCalendarState";
import TimeSlots from "@/components/admin/bookings/components/TimeSlots";
import { useActiveServices } from "./bookings/hooks/useActiveServices";
import { useActivePackages } from "./bookings/hooks/useActivePackages";
import { useAppointmentsByDate } from "./bookings/hooks/useAppointmentsByDate";
import { Appointment } from "./bookings/types";
import { CalendarIcon } from "lucide-react";
import { DndProvider } from "react-dnd";
import { BookingWorkflow } from "./bookings/components/BookingWorkflow";

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

  const { currentDate, nowPosition, goToday, goPrev, goNext } =
    useCalendarState();
  const { data: services } = useActiveServices();
  const { data: packages } = useActivePackages();
  const { data: appointments = [] } = useAppointmentsByDate(currentDate);

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
    }
    setIsAddAppointmentOpen(true);
    setClickedCell(null);
  };

  const closeAddAppointment = () => {
    setIsAddAppointmentOpen(false);
  };

  const handleCellClick = (cell: { employeeId: string; time: number; x: number; y: number; date: Date }) => {
    setClickedCell(cell);
  };

  const handleCheckoutFromAppointment = (appointment: Appointment) => {
    setSelectedAppointment(null);
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

        <div
          className={`fixed top-0 right-0 w-full max-w-6xl h-full bg-white z-50 transform transition-transform duration-300 ease-in-out shadow-xl ${
            isAddAppointmentOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {isAddAppointmentOpen && (
            <BookingWorkflow
              services={services}
              packages={packages}
              employees={employees}
              onClose={closeAddAppointment}
            />
          )}
        </div>
      </div>
    </DndProvider>
  );
}
