import React, { useState, useEffect } from "react";
import { format, subDays, isToday, addDays, parseISO, startOfDay, endOfDay } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  MoreHorizontal, 
  BarChart3, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Package, 
  Users, 
  ArrowRight, 
  CreditCard, 
  Percent, 
  User, 
  DollarSign, 
  TrendingDown, 
  TrendingUp, 
  Info, 
  LucideCalendarClock, 
  AlertCircle,
  ChevronRight,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminSupabase, supabase } from "@/integrations/supabase/client";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { toast } from "sonner";
import { StatsPanel } from "./bookings/components/StatsPanel";
import { Appointment } from "./bookings/types";
import { AppointmentDetailsDialog } from "./bookings/components/AppointmentDetailsDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppointmentManager } from "./bookings/components/AppointmentManager";
import { useAppointmentsByDate } from "./bookings/hooks/useAppointmentsByDate";

// Lazy load components for better performance
const LazyStatsPanel = React.lazy(() => import('./bookings/components/StatsPanel').then(module => ({ default: module.StatsPanel })));

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState("week");
  const [revenueData, setRevenueData] = useState([]);
  const [appointmentsStats, setAppointmentsStats] = useState({
    count: 0,
    value: 0
  });
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [upcomingAppointmentsChart, setUpcomingAppointmentsChart] = useState([]);
  const [upcomingStats, setUpcomingStats] = useState({
    total: 0,
    confirmed: 0,
    booked: 0,
    cancelled: 0
  });
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [appointmentsActivity, setAppointmentsActivity] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [topStylists, setTopStylists] = useState([]);
  const [businessMetrics, setBusinessMetrics] = useState({
    revenue: "0.00",
    occupancyRate: "0.00",
    returningCustomerRate: "0.00",
    tips: "0.00",
    revenueChange: "0.00",
    occupancyChange: "0.00",
    returningCustomerChange: "0.00",
    tipsChange: "--"
  });
  const [quickActions, setQuickActions] = useState({
    pendingConfirmations: 0,
    upcomingBookings: 0,
    todayBookings: 0,
    lowStockItems: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(null);
  const [appointmentTime, setAppointmentTime] = useState("");
  const [employees, setEmployees] = useState([]);
  
  const today = new Date();
  const { data: todayAppointmentsData = [] } = useAppointmentsByDate(today);

  useEffect(() => {
    fetchDashboardData();
    fetchEmployees();
  }, [timeRange]);

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

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchRevenueData(),
        fetchAppointmentsStats(),
        fetchUpcomingAppointments(),
        fetchTodayAppointments(),
        fetchAppointmentsActivity(),
        fetchTopServices(),
        fetchTopStylists(),
        fetchBusinessMetrics(),
        fetchQuickActionsData()
      ]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRevenueData = async () => {
    let startDate;
    switch (timeRange) {
      case "week":
        startDate = subDays(new Date(), 7);
        break;
      case "month":
        startDate = subDays(new Date(), 30);
        break;
      case "year":
        startDate = subDays(new Date(), 365);
        break;
      default:
        startDate = subDays(new Date(), 7);
    }

    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, total_price, created_at, status")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      const groupedData = {};
      let total = 0;

      data.forEach(appointment => {
        const date = format(new Date(appointment.created_at), "MMM-dd");
        if (!groupedData[date]) {
          groupedData[date] = {
            date,
            sales: 0,
            appointments: 0
          };
        }
        groupedData[date].sales += appointment.total_price || 0;
        groupedData[date].appointments += 1;
        total += appointment.total_price || 0;
      });

      const chartData = Object.values(groupedData);
      setRevenueData(chartData);
      setTotalRevenue(total);
      
      setAppointmentsStats({
        count: data.length,
        value: data.reduce((sum, app) => sum + (app.total_price || 0), 0)
      });
    } catch (error) {
      console.error("Error fetching revenue data:", error);
    }
  };

  const fetchAppointmentsStats = async () => {
  };

  const fetchUpcomingAppointments = async () => {
    try {
      const tomorrow = addDays(new Date(), 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const nextWeek = addDays(tomorrow, 7);
      nextWeek.setHours(23, 59, 59, 999);
      
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id, 
          start_time, 
          end_time, 
          status
        `)
        .gte("start_time", tomorrow.toISOString())
        .lt("start_time", nextWeek.toISOString())
        .order("start_time", { ascending: true });

      if (error) throw error;
      
      setUpcomingAppointments(data || []);
      
      const chartData = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const statusCounts = {
        total: 0,
        confirmed: 0,
        booked: 0,
        cancelled: 0
      };
      
      for (let i = 0; i < 7; i++) {
        const currentDate = addDays(tomorrow, i);
        const dayName = dayNames[currentDate.getDay()];
        const dayNum = currentDate.getDate();
        chartData.push({
          day: `${dayName} ${dayNum}`,
          confirmed: 0,
          booked: 0,
          cancelled: 0,
          date: currentDate
        });
      }
      
      data?.forEach(appointment => {
        const appointmentDate = parseISO(appointment.start_time);
        const dayIndex = Math.floor((appointmentDate.getTime() - tomorrow.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dayIndex >= 0 && dayIndex < 7) {
          statusCounts.total++;
          
          if (appointment.status === 'confirmed') {
            chartData[dayIndex].confirmed++;
            statusCounts.confirmed++;
          } else if (appointment.status === 'canceled') {
            chartData[dayIndex].cancelled++;
            statusCounts.cancelled++;
          } else if (appointment.status === 'booked') {
            chartData[dayIndex].booked++;
            statusCounts.booked++;
          }
        }
      });
      
      setUpcomingAppointmentsChart(chartData);
      setUpcomingStats(statusCounts);
      
    } catch (error) {
      console.error("Error fetching upcoming appointments:", error);
    }
  };

  const fetchTodayAppointments = async () => {
    try {
      setTodayAppointments(todayAppointmentsData || []);
    } catch (error) {
      console.error("Error fetching today's appointments:", error);
    }
  };

  const fetchAppointmentsActivity = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id, 
          start_time, 
          end_time, 
          status,
          total_price,
          customer:profiles (id, full_name),
          bookings (
            id,
            price_paid,
            service:services (id, name, duration),
            package:packages (id, name),
            employee:employees (id, name)
          )
        `)
        .order("start_time", { ascending: false })
        .limit(10);

      if (error) throw error;
      setAppointmentsActivity(data || []);
    } catch (error) {
      console.error("Error fetching appointments activity:", error);
    }
  };

  const fetchTopServices = async () => {
    try {
      const today = new Date();
      const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      
      const { data: thisMonthData, error: thisMonthError } = await supabase
        .from("bookings")
        .select(`
          service:services (id, name),
          created_at
        `)
        .gte("created_at", firstDayThisMonth.toISOString())
        .lte("created_at", lastDayThisMonth.toISOString())
        .not("service", "is", null);

      const { data: lastMonthData, error: lastMonthError } = await supabase
        .from("bookings")
        .select(`
          service:services (id, name),
          created_at
        `)
        .gte("created_at", firstDayLastMonth.toISOString())
        .lte("created_at", lastDayLastMonth.toISOString())
        .not("service", "is", null);

      if (thisMonthError || lastMonthError) throw thisMonthError || lastMonthError;

      const thisMonthCounts = {};
      thisMonthData?.forEach(booking => {
        if (booking.service) {
          const serviceName = booking.service.name;
          thisMonthCounts[serviceName] = (thisMonthCounts[serviceName] || 0) + 1;
        }
      });

      const lastMonthCounts = {};
      lastMonthData?.forEach(booking => {
        if (booking.service) {
          const serviceName = booking.service.name;
          lastMonthCounts[serviceName] = (lastMonthCounts[serviceName] || 0) + 1;
        }
      });

      const servicesArray = Object.keys(thisMonthCounts).map(serviceName => ({
        name: serviceName,
        thisMonth: thisMonthCounts[serviceName],
        lastMonth: lastMonthCounts[serviceName] || 0
      }));

      servicesArray.sort((a, b) => b.thisMonth - a.thisMonth);
      
      setTopServices(servicesArray.slice(0, 5));
    } catch (error) {
      console.error("Error fetching top services:", error);
    }
  };

  const fetchTopStylists = async () => {
    try {
      const today = new Date();
      const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      
      const { data: thisMonthData, error: thisMonthError } = await supabase
        .from("bookings")
        .select(`
          price_paid,
          employee:employees (id, name),
          created_at
        `)
        .gte("created_at", firstDayThisMonth.toISOString())
        .lte("created_at", lastDayThisMonth.toISOString())
        .not("employee", "is", null);

      const { data: lastMonthData, error: lastMonthError } = await supabase
        .from("bookings")
        .select(`
          price_paid,
          employee:employees (id, name),
          created_at
        `)
        .gte("created_at", firstDayLastMonth.toISOString())
        .lte("created_at", lastDayLastMonth.toISOString())
        .not("employee", "is", null);

      if (thisMonthError || lastMonthError) throw thisMonthError || lastMonthError;

      const thisMonthRevenue = {};
      thisMonthData?.forEach(booking => {
        if (booking.employee) {
          const stylistName = booking.employee.name;
          thisMonthRevenue[stylistName] = (thisMonthRevenue[stylistName] || 0) + (booking.price_paid || 0);
        }
      });

      const lastMonthRevenue = {};
      lastMonthData?.forEach(booking => {
        if (booking.employee) {
          const stylistName = booking.employee.name;
          lastMonthRevenue[stylistName] = (lastMonthRevenue[stylistName] || 0) + (booking.price_paid || 0);
        }
      });

      const stylistsArray = Object.keys(thisMonthRevenue).map(stylistName => ({
        name: stylistName,
        thisMonth: thisMonthRevenue[stylistName],
        lastMonth: lastMonthRevenue[stylistName] || 0
      }));

      stylistsArray.sort((a, b) => b.thisMonth - a.thisMonth);
      
      setTopStylists(stylistsArray.slice(0, 5));
    } catch (error) {
      console.error("Error fetching top stylists:", error);
    }
  };

  const fetchBusinessMetrics = async () => {
    try {
      const revenue = totalRevenue;
      
      const occupancyRate = 21.09;
      
      const returningCustomerRate = 65.12;
      
      const tips = 0.00;
      
      const revenueChange = -21.58;
      
      const occupancyChange = -0.99;
      
      const returningCustomerChange = -7.33;
      
      const tipsChange = "--";

      setBusinessMetrics({
        revenue: revenue.toFixed(2),
        occupancyRate: occupancyRate.toFixed(2),
        returningCustomerRate: returningCustomerRate.toFixed(2),
        tips: tips.toFixed(2),
        revenueChange: revenueChange.toFixed(2),
        occupancyChange: occupancyChange.toFixed(2),
        returningCustomerChange: returningCustomerChange.toFixed(2),
        tipsChange: tipsChange
      });
    } catch (error) {
      console.error("Error calculating business metrics:", error);
    }
  };

  const fetchQuickActionsData = async () => {
    try {
      const { data: pendingConfirmations, error: pendingError } = await supabase
        .from("appointments")
        .select("id")
        .eq("status", "pending");

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const { data: todayBookings, error: todayError } = await supabase
        .from("appointments")
        .select("id")
        .gte("start_time", today.toISOString())
        .lt("start_time", tomorrow.toISOString());

      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      
      const { data: upcomingBookings, error: upcomingError } = await supabase
        .from("appointments")
        .select("id")
        .gt("start_time", tomorrow.toISOString())
        .lte("start_time", nextWeek.toISOString());

      const { data: lowStockItems, error: lowStockError } = await supabase
        .from("inventory_items")
        .select("id")
        .lte("quantity", "minimum_quantity");

      if (pendingError || todayError || upcomingError || lowStockError) 
        throw pendingError || todayError || upcomingError || lowStockError;

      setQuickActions({
        pendingConfirmations: pendingConfirmations?.length || 0,
        todayBookings: todayBookings?.length || 0,
        upcomingBookings: upcomingBookings?.length || 0,
        lowStockItems: lowStockItems?.length || 0
      });
    } catch (error) {
      console.error("Error fetching quick actions data:", error);
    }
  };

  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment);
    setIsDetailsDialogOpen(true);
  };

  const handleCheckoutFromAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    
    const startDate = new Date(appointment.start_time);
    setAppointmentDate(startDate);
    setAppointmentTime(format(startDate, 'HH:mm'));
    
    setIsDetailsDialogOpen(false);
    setIsAddAppointmentOpen(true);
  };

  const closeAppointmentManager = () => {
    setIsAddAppointmentOpen(false);
    setSelectedAppointment(null);
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case "week":
        return "Last 7 days";
      case "month":
        return "Last 30 days";
      case "year":
        return "Last 365 days";
      default:
        return "Last 7 days";
    }
  };

  const formatAppointmentStatus = (status) => {
    switch (status) {
      case "confirmed":
        return <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">CONFIRMED</span>;
      case "pending":
        return <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">PENDING</span>;
      case "canceled":
        return <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">CANCELED</span>;
      case "completed":
        return <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">COMPLETED</span>;
      case "booked":
        return <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">BOOKED</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">BOOKED</span>;
    }
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">Recent sales</CardTitle>
              <CardDescription>{getTimeRangeLabel()}</CardDescription>
            </div>
            <Select
              value={timeRange}
              onValueChange={setTimeRange}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">₹{totalRevenue.toFixed(2)}</div>
              <div className="text-sm text-gray-500">
                Appointments {appointmentsStats.count}<br />
                Appointments value ₹{appointmentsStats.value.toFixed(2)}
              </div>
            </div>
            
            <div className="h-[200px] mt-4">
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={revenueData}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#8884d8" 
                      name="Sales" 
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="appointments" 
                      stroke="#82ca9d" 
                      name="Appointments"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">No data available for the selected period</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <React.Suspense fallback={<div className="h-[400px] flex items-center justify-center">Loading...</div>}>
          <LazyStatsPanel 
            stats={[]} 
            chartData={upcomingAppointmentsChart}
            totalBooked={upcomingStats.total}
            confirmedCount={upcomingStats.confirmed}
            bookedCount={upcomingStats.booked}
            cancelledCount={upcomingStats.cancelled}
          />
        </React.Suspense>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today's next appointments</CardTitle>
            <CardDescription>
              Total: {todayAppointmentsData.length} appointments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              {todayAppointmentsData.length > 0 ? (
                <div className="space-y-4">
                  {todayAppointmentsData.map((appointment) => {
                    const mainBooking = appointment.bookings[0];
                    const serviceName = mainBooking?.service?.name || mainBooking?.package?.name || "Appointment";
                    const price = mainBooking?.price_paid || appointment.total_price || 0;
                    const stylist = mainBooking?.employee?.name;
                    
                    return (
                      <div 
                        key={appointment.id} 
                        className="flex items-start hover:bg-gray-50 p-2 rounded cursor-pointer transition-colors"
                        onClick={() => handleAppointmentClick(appointment)}
                      >
                        <div className="mr-4 text-center">
                          <div className="font-bold">
                            {format(new Date(appointment.start_time), "HH:mm")}
                          </div>
                        </div>
                        <div className="flex flex-1 justify-between">
                          <div>
                            <div className="font-medium">{serviceName}</div>
                            <div className="text-sm text-gray-500">
                              {appointment.customer?.full_name} {stylist && `with ${stylist}`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">₹{price.toFixed(2)}</div>
                            <div className="mt-1">{formatAppointmentStatus(appointment.status)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Clock className="w-12 h-12 mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">No Appointments Today</h3>
                  <p className="text-sm text-gray-500 text-center mb-4">
                    Visit the <a href="/admin/bookings" className="text-blue-500 hover:underline">calendar</a> section to add some appointments
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left font-medium text-gray-500 pb-3">Service</th>
                    <th className="text-right font-medium text-gray-500 pb-3">This month</th>
                    <th className="text-right font-medium text-gray-500 pb-3">Last month</th>
                  </tr>
                </thead>
                <tbody>
                  {topServices.length > 0 ? (
                    topServices.map((service, index) => (
                      <tr key={index} className="border-t">
                        <td className="py-3">{service.name}</td>
                        <td className="py-3 text-right">{service.thisMonth}</td>
                        <td className="py-3 text-right">{service.lastMonth}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-muted-foreground">
                        No service data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top team member</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left font-medium text-gray-500 pb-3">Team member</th>
                    <th className="text-right font-medium text-gray-500 pb-3">This month</th>
                    <th className="text-right font-medium text-gray-500 pb-3">Last month</th>
                  </tr>
                </thead>
                <tbody>
                  {topStylists.length > 0 ? (
                    topStylists.map((stylist, index) => (
                      <tr key={index} className="border-t">
                        <td className="py-3">{stylist.name}</td>
                        <td className="py-3 text-right">₹{stylist.thisMonth.toFixed(2)}</td>
                        <td className="py-3 text-right">₹{stylist.lastMonth.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-muted-foreground">
                        No team member data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">      
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Low Stock Items</span>
                </div>
                <Button variant="ghost" size="icon" asChild>
                  <a href="#"><Info className="h-4 w-4" /></a>
                </Button>
              </div>
              <div className="text-3xl font-bold mb-4 text-center text-red-500">
                {quickActions.lowStockItems}
              </div>
              <Button variant="ghost" size="sm" className="w-full flex items-center justify-center text-blue-500" asChild>
                <a href="/admin/inventory">
                  <span>Order Stock</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Business Performance</h2>
          <Select defaultValue="today">
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Today" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
         
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Percent className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Occupancy Rate</span>
                </div>
                <Button variant="ghost" size="icon" asChild>
                  <a href="#"><Info className="h-4 w-4" /></a>
                </Button>
              </div>
              <div className="text-3xl font-bold mb-2">
                {businessMetrics.occupancyRate}%
              </div>
              <div className={`text-sm flex items-center ${parseFloat(businessMetrics.occupancyChange) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                {parseFloat(businessMetrics.occupancyChange) < 0 ? (
                  <TrendingDown className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingUp className="h-4 w-4 mr-1" />
                )}
                {parseFloat(businessMetrics.occupancyChange) < 0 ? businessMetrics.occupancyChange : `+${businessMetrics.occupancyChange}`}% vs Yesterday
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Returning Customer Rate</span>
                </div>
                <Button variant="ghost" size="icon" asChild>
                  <a href="#"><Info className="h-4 w-4" /></a>
                </Button>
              </div>
              <div className="text-3xl font-bold mb-2">
                {businessMetrics.returningCustomerRate}%
              </div>
              <div className={`text-sm flex items-center ${parseFloat(businessMetrics.returningCustomerChange) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                {parseFloat(businessMetrics.returningCustomerChange) < 0 ? (
                  <TrendingDown className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingUp className="h-4 w-4 mr-1" />
                )}
                {parseFloat(businessMetrics.returningCustomerChange) < 0 ? businessMetrics.returningCustomerChange : `+${businessMetrics.returningCustomerChange}`}% vs Yesterday
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <AppointmentDetailsDialog 
        appointment={selectedAppointment}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        onUpdated={fetchTodayAppointments}
        onCheckout={handleCheckoutFromAppointment}
        onEdit={() => {
          handleCheckoutFromAppointment(selectedAppointment as Appointment);
        }}
      />

      {isAddAppointmentOpen && appointmentDate && (
        <AppointmentManager
          isOpen={isAddAppointmentOpen}
          onClose={closeAppointmentManager}
          selectedDate={appointmentDate}
          selectedTime={appointmentTime}
          employees={employees}
          existingAppointment={selectedAppointment}
        />
      )}
    </div>
  );
}
