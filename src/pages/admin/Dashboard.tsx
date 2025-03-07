
import React, { useState, useEffect, useRef, useCallback } from "react";
import { format, subDays, isToday } from "date-fns";
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
  Zap,
  Loader2
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
  ResponsiveContainer 
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
import { 
  useUpcomingAppointments, 
  useTodayAppointments, 
  useAppointmentsActivity,
  usePerformanceMetrics
} from "./bookings/hooks/useDashboardAppointments";
import { useInView } from "react-intersection-observer";
import { AppointmentStatus } from "./bookings/types";

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState("week");
  const [revenueData, setRevenueData] = useState([]);
  const [appointmentsStats, setAppointmentsStats] = useState({
    count: 0,
    value: 0
  });
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [appointmentsActivityPage, setAppointmentsActivityPage] = useState(0);
  const [allAppointmentActivity, setAllAppointmentActivity] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [topStylists, setTopStylists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quickActions, setQuickActions] = useState({
    pendingConfirmations: 0,
    upcomingBookings: 0,
    todayBookings: 0,
    lowStockItems: 0
  });
  
  // Load more ref for infinite scrolling
  const { ref: loadMoreRef, inView } = useInView();

  // Queries
  const { 
    data: upcomingAppointments = [], 
    isLoading: isUpcomingLoading 
  } = useUpcomingAppointments(5);
  
  const { 
    data: todayAppointments = [], 
    isLoading: isTodayLoading 
  } = useTodayAppointments();
  
  const { 
    data: appointmentsActivity = [], 
    isLoading: isActivityLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useAppointmentsActivity(appointmentsActivityPage, 10);

  const { 
    data: performanceMetrics = { 
      totalAppointments: 0, 
      totalRevenue: 0, 
      occupancyRate: 0, 
      returningCustomerRate: 0 
    }, 
    isLoading: isMetricsLoading 
  } = usePerformanceMetrics(timeRange);

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  // Handle infinite scroll for appointments activity
  useEffect(() => {
    if (appointmentsActivity?.length) {
      setAllAppointmentActivity(prev => 
        [...prev, ...appointmentsActivity.filter(app => 
          !prev.some(p => p.id === app.id)
        )]
      );
    }
  }, [appointmentsActivity]);

  // Load more when scrolled to bottom
  useEffect(() => {
    if (inView && !isActivityLoading) {
      setAppointmentsActivityPage(prev => prev + 1);
    }
  }, [inView, isActivityLoading]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchRevenueData(),
        fetchTopServices(),
        fetchTopStylists(),
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
    // Get dates for selected time range
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

      // Group by date and calculate total
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
      
      // Calculate appointments stats
      setAppointmentsStats({
        count: data.length,
        value: data.reduce((sum, app) => sum + (app.total_price || 0), 0)
      });
    } catch (error) {
      console.error("Error fetching revenue data:", error);
    }
  };

  const fetchTopServices = async () => {
    try {
      // Get this month's range
      const today = new Date();
      const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      // Get last month's range
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      
      // Current month query
      const { data: thisMonthData, error: thisMonthError } = await supabase
        .from("bookings")
        .select(`
          service:services (id, name),
          created_at
        `)
        .gte("created_at", firstDayThisMonth.toISOString())
        .lte("created_at", lastDayThisMonth.toISOString())
        .not("service", "is", null);

      // Last month query
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

      // Count service occurrences for this month
      const thisMonthCounts = {};
      thisMonthData?.forEach(booking => {
        if (booking.service) {
          const serviceName = booking.service.name;
          thisMonthCounts[serviceName] = (thisMonthCounts[serviceName] || 0) + 1;
        }
      });

      // Count service occurrences for last month
      const lastMonthCounts = {};
      lastMonthData?.forEach(booking => {
        if (booking.service) {
          const serviceName = booking.service.name;
          lastMonthCounts[serviceName] = (lastMonthCounts[serviceName] || 0) + 1;
        }
      });

      // Create sorted array of services
      const servicesArray = Object.keys(thisMonthCounts).map(serviceName => ({
        name: serviceName,
        thisMonth: thisMonthCounts[serviceName],
        lastMonth: lastMonthCounts[serviceName] || 0
      }));

      // Sort by this month's count
      servicesArray.sort((a, b) => b.thisMonth - a.thisMonth);
      
      setTopServices(servicesArray.slice(0, 5));
    } catch (error) {
      console.error("Error fetching top services:", error);
    }
  };

  const fetchTopStylists = async () => {
    try {
      // Get this month's range
      const today = new Date();
      const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      // Get last month's range
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      
      // Current month query
      const { data: thisMonthData, error: thisMonthError } = await supabase
        .from("bookings")
        .select(`
          price_paid,
          employee:employees!bookings_employee_id_fkey (id, name),
          created_at
        `)
        .gte("created_at", firstDayThisMonth.toISOString())
        .lte("created_at", lastDayThisMonth.toISOString())
        .not("employee", "is", null);

      // Last month query
      const { data: lastMonthData, error: lastMonthError } = await supabase
        .from("bookings")
        .select(`
          price_paid,
          employee:employees!bookings_employee_id_fkey (id, name),
          created_at
        `)
        .gte("created_at", firstDayLastMonth.toISOString())
        .lte("created_at", lastDayLastMonth.toISOString())
        .not("employee", "is", null);

      if (thisMonthError || lastMonthError) throw thisMonthError || lastMonthError;

      // Sum revenue by stylist for this month
      const thisMonthRevenue = {};
      thisMonthData?.forEach(booking => {
        if (booking.employee && booking.employee.name) {
          const stylistName = booking.employee.name;
          thisMonthRevenue[stylistName] = (thisMonthRevenue[stylistName] || 0) + (booking.price_paid || 0);
        }
      });

      // Sum revenue by stylist for last month
      const lastMonthRevenue = {};
      lastMonthData?.forEach(booking => {
        if (booking.employee && booking.employee.name) {
          const stylistName = booking.employee.name;
          lastMonthRevenue[stylistName] = (lastMonthRevenue[stylistName] || 0) + (booking.price_paid || 0);
        }
      });

      // Create sorted array of stylists
      const stylistsArray = Object.keys(thisMonthRevenue).map(stylistName => ({
        name: stylistName,
        thisMonth: thisMonthRevenue[stylistName],
        lastMonth: lastMonthRevenue[stylistName] || 0
      }));

      // Sort by this month's revenue
      stylistsArray.sort((a, b) => b.thisMonth - a.thisMonth);
      
      setTopStylists(stylistsArray.slice(0, 5));
    } catch (error) {
      console.error("Error fetching top stylists:", error);
    }
  };

  const fetchQuickActionsData = async () => {
    try {
      // Pending confirmations
      const { data: pendingConfirmations, error: pendingError } = await supabase
        .from("appointments")
        .select("id")
        .eq("status", "pending");

      // Today's bookings
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const { data: todayBookings, error: todayError } = await supabase
        .from("appointments")
        .select("id")
        .gte("start_time", today.toISOString())
        .lt("start_time", tomorrow.toISOString());

      // Upcoming bookings (next 7 days)
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      
      const { data: upcomingBookings, error: upcomingError } = await supabase
        .from("appointments")
        .select("id")
        .gt("start_time", tomorrow.toISOString())
        .lte("start_time", nextWeek.toISOString());

      // Low stock items
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

  const formatAppointmentStatus = (status: AppointmentStatus) => {
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
        return <span className="px-2 py-1 text-xs font-medium rounded bg-indigo-100 text-indigo-800">BOOKED</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">{status.toUpperCase()}</span>;
    }
  };

  // Lazy loading container component
  const LazyContainer = ({ isLoading, isEmpty, children, emptyMessage, emptyIcon }) => (
    <div className="relative min-h-[200px]">
      {isLoading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
          <p className="text-muted-foreground">Loading data...</p>
        </div>
      ) : isEmpty ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {emptyIcon}
          <h3 className="text-lg font-semibold mb-2">No data available</h3>
          <p className="text-sm text-gray-500 text-center mb-4">{emptyMessage}</p>
        </div>
      ) : (
        children
      )}
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      {/* Sales & Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Sales */}
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
              <LazyContainer
                isLoading={isLoading}
                isEmpty={revenueData.length === 0}
                emptyMessage="No sales data available for the selected period"
                emptyIcon={<BarChart3 className="w-12 h-12 mb-4 text-gray-300" />}
              >
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
              </LazyContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Upcoming Appointments */}
        <Card>
          <CardHeader className="flex justify-between">
            <div>
              <CardTitle className="text-lg">Upcoming appointments</CardTitle>
              <CardDescription>Next 7 days</CardDescription>
            </div>
            <Button variant="ghost" size="icon" asChild>
              <a href="/admin/bookings">
                <MoreHorizontal className="h-4 w-4" />
              </a>
            </Button>
          </CardHeader>
          <CardContent>
            <LazyContainer
              isLoading={isUpcomingLoading}
              isEmpty={upcomingAppointments.length === 0}
              emptyMessage="Make some appointments for schedule data to appear"
              emptyIcon={<Calendar className="w-12 h-12 mb-4 text-gray-300" />}
            >
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => {
                  const mainService = appointment.bookings.find(b => b.service)?.service;
                  const stylist = appointment.bookings.find(b => b.employee)?.employee;
                  
                  return (
                    <div key={appointment.id} className="flex justify-between items-start pb-4 border-b">
                      <div>
                        <div className="font-medium">{mainService?.name || "Appointment"}</div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(appointment.start_time), "EEE, dd MMM yyyy HH:mm")}
                        </div>
                        <div className="text-sm text-gray-500">
                          {appointment.customer?.full_name}{stylist && ` with ${stylist.name}`}
                        </div>
                      </div>
                      <div>
                        {formatAppointmentStatus(appointment.status)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </LazyContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Appointments Activity & Today's Appointments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appointments Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Appointments activity</CardTitle>
          </CardHeader>
          <CardContent>
            <LazyContainer
              isLoading={isActivityLoading && appointmentsActivityPage === 0}
              isEmpty={allAppointmentActivity.length === 0}
              emptyMessage="No appointment activity yet"
              emptyIcon={<BarChart3 className="w-12 h-12 mb-4 text-gray-300" />}
            >
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {allAppointmentActivity.map((appointment) => {
                  const mainBooking = appointment.bookings[0];
                  const serviceName = mainBooking?.service?.name || mainBooking?.package?.name || "Appointment";
                  const price = mainBooking?.price_paid || appointment.total_price || 0;
                  const stylist = mainBooking?.employee?.name;
                  const duration = mainBooking?.service?.duration || "60";
                  
                  return (
                    <div key={appointment.id} className="flex items-start">
                      <div className="mr-4 text-center">
                        <div className="font-bold">
                          {format(new Date(appointment.start_time), "dd")}
                        </div>
                        <div className="text-xs">
                          {format(new Date(appointment.start_time), "MMM")}
                        </div>
                      </div>
                      <div className="flex flex-1 justify-between">
                        <div>
                          <div className="font-medium">{serviceName}</div>
                          <div className="text-sm text-gray-500">
                            {appointment.customer?.full_name}, {duration}min {stylist && `with ${stylist}`}
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
                {/* Load more indicator */}
                <div ref={loadMoreRef} className="flex justify-center py-2">
                  {isFetchingNextPage && (
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
            </LazyContainer>
          </CardContent>
        </Card>
        
        {/* Today's Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today's next appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <LazyContainer
              isLoading={isTodayLoading}
              isEmpty={todayAppointments.length === 0}
              emptyMessage="Visit the calendar section to add some appointments"
              emptyIcon={<Clock className="w-12 h-12 mb-4 text-gray-300" />}
            >
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {todayAppointments
                  .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                  .map((appointment) => {
                    const mainBooking = appointment.bookings[0];
                    const serviceName = mainBooking?.service?.name || mainBooking?.package?.name || "Appointment";
                    const price = mainBooking?.price_paid || appointment.total_price || 0;
                    const stylist = mainBooking?.employee?.name;
                    
                    return (
                      <div key={appointment.id} className="flex items-start">
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
            </LazyContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Top Services & Top Team Members */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Services */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top services</CardTitle>
          </CardHeader>
          <CardContent>
            <LazyContainer
              isLoading={isLoading}
              isEmpty={topServices.length === 0}
              emptyMessage="No service data available"
              emptyIcon={<Package className="w-12 h-12 mb-4 text-gray-300" />}
            >
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
                    {topServices.map((service, index) => (
                      <tr key={index} className="border-t">
                        <td className="py-3">{service.name}</td>
                        <td className="py-3 text-right">{service.thisMonth}</td>
                        <td className="py-3 text-right">{service.lastMonth}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </LazyContainer>
          </CardContent>
        </Card>
        
        {/* Top Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top team member</CardTitle>
          </CardHeader>
          <CardContent>
            <LazyContainer
              isLoading={isLoading}
              isEmpty={topStylists.length === 0}
              emptyMessage="No team member data available"
              emptyIcon={<Users className="w-12 h-12 mb-4 text-gray-300" />}
            >
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
                    {topStylists.map((stylist, index) => (
                      <tr key={index} className="border-t">
                        <td className="py-3">{stylist.name}</td>
                        <td className="py-3 text-right">₹{stylist.thisMonth.toFixed(2)}</td>
                        <td className="py-3 text-right">₹{stylist.lastMonth.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </LazyContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Quick Actions Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Pending Confirmations</span>
                </div>
                <Button variant="ghost" size="icon" asChild>
                  <a href="#"><Info className="h-4 w-4" /></a>
                </Button>
              </div>
              <div className="text-3xl font-bold mb-4 text-center">
                {quickActions.pendingConfirmations}
              </div>
              <Button variant="ghost" size="sm" className="w-full flex items-center justify-center text-blue-500" asChild>
                <a href="/admin/bookings">
                  <span>Confirm Bookings</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Upcoming Bookings</span>
                </div>
                <Button variant="ghost" size="icon" asChild>
                  <a href="#"><Info className="h-4 w-4" /></a>
                </Button>
              </div>
              <div className="text-3xl font-bold mb-4 text-center">
                {quickActions.upcomingBookings}
              </div>
              <Button variant="ghost" size="sm" className="w-full flex items-center justify-center text-blue-500" asChild>
                <a href="/admin/bookings">
                  <span>View Bookings</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Today's Bookings</span>
                </div>
                <Button variant="ghost" size="icon" asChild>
                  <a href="#"><Info className="h-4 w-4" /></a>
                </Button>
              </div>
              <div className="text-3xl font-bold mb-4 text-center">
                {quickActions.todayBookings}
              </div>
              <Button variant="ghost" size="sm" className="w-full flex items-center justify-center text-blue-500" asChild>
                <a href="/admin/bookings">
                  <span>View Bookings</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </CardContent>
          </Card>
          
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
      
      {/* Business Performance Metrics */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Business Performance</h2>
          <Select defaultValue="month" onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="This Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
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
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Revenue</span>
                </div>
                <Button variant="ghost" size="icon" asChild>
                  <a href="#"><Info className="h-4 w-4" /></a>
                </Button>
              </div>
              <LazyContainer
                isLoading={isMetricsLoading}
                isEmpty={false}
                emptyMessage=""
                emptyIcon={null}
              >
                <div className="text-3xl font-bold mb-2">
                  ₹{performanceMetrics.totalRevenue.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">
                  Total appointments: {performanceMetrics.totalAppointments}
                </div>
              </LazyContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Percent className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Occupancy Rate</span>
                </div>
                <Button variant="ghost" size="icon" asChild>
                  <a href="#" title="Percentage of available time slots that are booked">
                    <Info className="h-4 w-4" />
                  </a>
                </Button>
              </div>
              <LazyContainer
                isLoading={isMetricsLoading}
                isEmpty={false}
                emptyMessage=""
                emptyIcon={null}
              >
                <div className="text-3xl font-bold mb-2">
                  {performanceMetrics.occupancyRate.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-500">
                  Booked vs. available time slots
                </div>
              </LazyContainer>
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
                  <a href="#" title="Percentage of customers who have made repeat bookings">
                    <Info className="h-4 w-4" />
                  </a>
                </Button>
              </div>
              <LazyContainer
                isLoading={isMetricsLoading}
                isEmpty={false}
                emptyMessage=""
                emptyIcon={null}
              >
                <div className="text-3xl font-bold mb-2">
                  {performanceMetrics.returningCustomerRate.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-500">
                  Returning vs. new customers
                </div>
              </LazyContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Tips</span>
                </div>
                <Button variant="ghost" size="icon" asChild>
                  <a href="#"><Info className="h-4 w-4" /></a>
                </Button>
              </div>
              <div className="text-3xl font-bold mb-2">
                ₹0.00
              </div>
              <div className="text-sm text-gray-500">
                Coming soon
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
