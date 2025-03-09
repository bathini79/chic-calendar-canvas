// Dashboard.tsx - Main dashboard component
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ActivityIcon, Calendar, DollarSign, Users } from "lucide-react";
import { Appointment } from "./bookings/types";
import { AppointmentDetailsDialog } from "./bookings/components/AppointmentDetailsDialog";
import { AppointmentManager } from "./bookings/components/AppointmentManager";
import { useAppointmentsByDate } from "./bookings/hooks/useAppointmentsByDate";

export default function Dashboard() {
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(true);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [totalClients, setTotalClients] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [topEmployee, setTopEmployee] = useState<{ name: string; count: number } | null>(null);
  const [employees, setEmployees] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false);
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(null);

  // Get today's date for fetching appointments
  const today = new Date();
  const { data: appointmentsData = [] } = useAppointmentsByDate(today);

  useEffect(() => {
    fetchDashboardStats();
    fetchEmployees();
  }, []);

  useEffect(() => {
    // Update today's appointments when appointmentsData changes
    if (appointmentsData.length > 0) {
      // Sort appointments by start_time
      const sortedAppointments = [...appointmentsData].sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
      setTodayAppointments(sortedAppointments);
      setIsLoadingAppointments(false);
    } else {
      setTodayAppointments([]);
      setIsLoadingAppointments(false);
    }
  }, [appointmentsData]);

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

  const fetchDashboardStats = async () => {
    try {
      // Fetch total clients
      const { count: clientCount, error: clientError } = await supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .eq("role", "customer");

      if (clientError) throw clientError;
      setTotalClients(clientCount || 0);
      setIsLoadingClients(false);

      // Fetch total revenue (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: revenueData, error: revenueError } = await supabase
        .from("appointments")
        .select("total_price")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .eq("status", "completed");

      if (revenueError) throw revenueError;
      const revenue = revenueData.reduce(
        (sum, appointment) => sum + (appointment.total_price || 0),
        0
      );
      setTotalRevenue(revenue);
      setIsLoadingRevenue(false);

      // Fetch total appointments (today)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { count: appointmentCount, error: appointmentError } = await supabase
        .from("appointments")
        .select("*", { count: "exact" })
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString());

      if (appointmentError) throw appointmentError;
      setTotalAppointments(appointmentCount || 0);
      setIsLoadingAppointments(false);

      // Fetch top employee by appointments count
      const { data: topEmployeeData, error: topEmployeeError } = await supabase
        .from("bookings")
        .select(`
          employee_id,
          employees!bookings_employee_id_fkey (
            name
          ),
          count
        `)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .not("employee_id", "is", null)
        .group("employee_id, employees.name");

      if (topEmployeeError) throw topEmployeeError;

      if (topEmployeeData && topEmployeeData.length > 0) {
        const sorted = topEmployeeData.sort((a, b) => b.count - a.count);
        const top = sorted[0];
        setTopEmployee({
          name: top.employees.name,
          count: top.count,
        });
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    }
  };

  const handleViewAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
  };

  const handleCheckoutFromAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    
    // Set the appointment date and time from the existing appointment
    const startDate = new Date(appointment.start_time);
    setAppointmentDate(startDate);
    setAppointmentTime(format(startDate, 'HH:mm'));
    
    setIsAddAppointmentOpen(true);
  };

  const closeAddAppointment = () => {
    setIsAddAppointmentOpen(false);
    setSelectedAppointment(null);
  };

  const renderAppointmentTimeInfo = (appointment: Appointment) => {
    const startTime = new Date(appointment.start_time);
    const endTime = new Date(appointment.end_time);
    
    return (
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
        </span>
        <span className="text-xs text-muted-foreground">
          {Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))} min
        </span>
      </div>
    );
  };

  const renderAppointmentServices = (appointment: Appointment) => {
    const services = appointment.bookings
      .filter(booking => booking.service)
      .map(booking => booking.service?.name)
      .filter(Boolean);
    
    const packages = appointment.bookings
      .filter(booking => booking.package)
      .map(booking => booking.package?.name)
      .filter(Boolean);
    
    const allServices = [...services, ...packages];
    
    if (allServices.length === 0) return <span className="text-sm">No services</span>;
    
    return (
      <div className="text-sm">
        {allServices.slice(0, 2).join(", ")}
        {allServices.length > 2 && `, +${allServices.length - 2} more`}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingClients ? (
              <div className="h-6 w-20 animate-pulse bg-gray-200 rounded"></div>
            ) : (
              <div className="text-2xl font-bold">{totalClients}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue (30 days)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingRevenue ? (
              <div className="h-6 w-20 animate-pulse bg-gray-200 rounded"></div>
            ) : (
              <div className="text-2xl font-bold">₹{totalRevenue.toFixed(2)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingAppointments ? (
              <div className="h-6 w-20 animate-pulse bg-gray-200 rounded"></div>
            ) : (
              <div className="text-2xl font-bold">{totalAppointments}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Top Stylist</CardTitle>
            <ActivityIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {topEmployee ? (
              <div>
                <div className="text-2xl font-bold">{topEmployee.name}</div>
                <p className="text-xs text-muted-foreground">
                  {topEmployee.count} appointments
                </p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Upcoming Appointments */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Today's Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAppointments ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : todayAppointments.length > 0 ? (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {todayAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleViewAppointment(appointment)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {appointment.customer?.full_name || "No name"}
                        </div>
                        {renderAppointmentServices(appointment)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      {renderAppointmentTimeInfo(appointment)}
                      <div className="mt-1 px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                        {appointment.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No appointments scheduled for today
              </div>
            )}
          </CardContent>
        </Card>

        {/* Other dashboard content can go here */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Activity feed coming soon
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointment Details Dialog */}
      <AppointmentDetailsDialog
        appointment={selectedAppointment}
        open={!!selectedAppointment && !isAddAppointmentOpen}
        onOpenChange={() => setSelectedAppointment(null)}
        onCheckout={handleCheckoutFromAppointment}
      />

      {/* Appointment Manager for editing */}
      {isAddAppointmentOpen && appointmentDate && (
        <AppointmentManager
          isOpen={isAddAppointmentOpen}
          onClose={closeAddAppointment}
          selectedDate={appointmentDate}
          selectedTime={appointmentTime}
          employees={employees}
          existingAppointment={selectedAppointment}
        />
      )}
    </div>
  );
}
