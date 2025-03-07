
import React, { useState, useEffect, useCallback, useRef } from "react";
import { format, isToday } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  BarChart3, 
  Calendar, 
  Clock, 
  CheckCircle, 
  Package, 
  ArrowRight, 
  CreditCard, 
  Percent, 
  User, 
  DollarSign, 
  TrendingDown, 
  TrendingUp, 
  Info,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { toast } from "sonner";
import { useInView } from 'react-intersection-observer';
import { StatsPanel } from "./bookings/components/StatsPanel";
import { 
  useUpcomingAppointments, 
  useTodayAppointments, 
  useAppointmentActivity, 
  useBusinessMetrics, 
  useQuickActionsData 
} from "./bookings/hooks/useDashboardAppointments";
import { useAppointmentsByDate } from "./bookings/hooks/useAppointmentsByDate";
import { Appointment } from "./bookings/types";

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState("week");
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [appointmentsStats, setAppointmentsStats] = useState({
    count: 0,
    value: 0
  });
  const [activityPage, setActivityPage] = useState(1);
  const [appointmentsActivity, setAppointmentsActivity] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMoreActivity, setShowMoreActivity] = useState(false);

  // Intersection observer for infinite scroll
  const { ref: activityEndRef, inView } = useInView({
    threshold: 0.5,
  });

  // Fetch upcoming appointments
  const { 
    data: upcomingAppointments = [],
    isLoading: upcomingLoading,
    error: upcomingError 
  } = useUpcomingAppointments(5);

  // Fetch today's appointments
  const { 
    data: todayAppointments = [],
    isLoading: todayLoading,
    error: todayError 
  } = useTodayAppointments();

  // Fetch appointment activity
  const { 
    data: activityData = [],
    isLoading: activityLoading,
    error: activityError,
    refetch: refetchActivity
  } = useAppointmentActivity(10 * activityPage);

  // Fetch business metrics
  const { 
    data: businessMetrics,
    isLoading: metricsLoading,
    error: metricsError 
  } = useBusinessMetrics();

  // Fetch quick actions data
  const { 
    data: quickActions = {
      pendingConfirmations: 0,
      upcomingBookings: 0,
      todayBookings: 0,
      lowStockItems: 0
    },
    isLoading: actionsLoading,
    error: actionsError 
  } = useQuickActionsData();

  // Fetch revenue data
  const currentDate = new Date();
  const { data: dailyAppointments = [] } = useAppointmentsByDate(currentDate);

  // Load more activity data when reaching the bottom
  useEffect(() => {
    if (inView && !activityLoading && !loading && showMoreActivity) {
      setLoading(true);
      setActivityPage(prev => prev + 1);
      setTimeout(() => {
        refetchActivity().then(() => setLoading(false));
      }, 500);
    }
  }, [inView, activityLoading, loading, refetchActivity, showMoreActivity]);

  // Update appointments activity when data changes
  useEffect(() => {
    if (activityData && activityData.length > 0) {
      setAppointmentsActivity(activityData);
    }
  }, [activityData]);

  // Initialize revenue data
  useEffect(() => {
    if (dailyAppointments && dailyAppointments.length > 0) {
      updateRevenueData(dailyAppointments);
    }
  }, [dailyAppointments, timeRange]);

  // Calculate revenue data from appointments
  const updateRevenueData = useCallback((appointments: Appointment[]) => {
    // Group by date and calculate total
    const groupedData: Record<string, { date: string; sales: number; appointments: number }> = {};
    let total = 0;

    appointments.forEach(appointment => {
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
    
    // Calculate appointments stats
    setAppointmentsStats({
      count: appointments.length,
      value: appointments.reduce((sum, app) => sum + (app.total_price || 0), 0)
    });
  }, []);

  const formatAppointmentStatus = (status: string) => {
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

  // Handle errors
  useEffect(() => {
    if (upcomingError || todayError || activityError || metricsError || actionsError) {
      toast.error("Failed to load some dashboard data");
      console.error("Dashboard errors:", { upcomingError, todayError, activityError, metricsError, actionsError });
    }
  }, [upcomingError, todayError, activityError, metricsError, actionsError]);

  const loadMoreAppointments = () => {
    setShowMoreActivity(true);
    if (!inView) {
      // If not in view, manually trigger another page load
      setActivityPage(prev => prev + 1);
      setTimeout(() => refetchActivity(), 500);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      {/* Dashboard Stats Panel */}
      <StatsPanel 
        stats={[
          { label: "Today's Revenue", value: dailyAppointments.reduce((sum, app) => sum + app.total_price, 0) },
          { label: "Today's Appointments", value: dailyAppointments.length },
          { label: "Pending Confirmations", value: quickActions.pendingConfirmations },
          { label: "Occupancy Rate", value: businessMetrics?.occupancyRate ? `${businessMetrics.occupancyRate}%` : '0%' },
        ]}
      />
      
      {/* Sales & Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <Card>
          <CardHeader className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">Recent sales</CardTitle>
              <CardDescription>
                {timeRange === "week" ? "Last 7 days" : 
                 timeRange === "month" ? "Last 30 days" : "Last 365 days"}
              </CardDescription>
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
              <div className="text-3xl font-bold">
                ₹{appointmentsStats.value.toFixed(2)}
              </div>
              <div className="text-sm text-gray-500">
                Appointments {appointmentsStats.count}<br />
                Appointments value ₹{appointmentsStats.value.toFixed(2)}
              </div>
            </div>
            
            <div className="h-[200px] mt-4">
              {revenueData.length > 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-lg font-semibold">Revenue chart visualization</p>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">No data available for the selected period</p>
                </div>
              )}
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
          </CardHeader>
          <CardContent>
            {upcomingLoading ? (
              <div className="flex justify-center py-8">
                <p className="text-muted-foreground">Loading appointments...</p>
              </div>
            ) : upcomingAppointments.length > 0 ? (
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
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="w-12 h-12 mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Your schedule is empty</h3>
                <p className="text-sm text-gray-500 text-center mb-4">
                  Make some appointments for schedule data to appear
                </p>
                <Button asChild>
                  <a href="/admin/bookings">Book Appointment</a>
                </Button>
              </div>
            )}
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
            {activityLoading && appointmentsActivity.length === 0 ? (
              <div className="flex justify-center py-8">
                <p className="text-muted-foreground">Loading appointments...</p>
              </div>
            ) : appointmentsActivity.length > 0 ? (
              <div className="space-y-4">
                {appointmentsActivity.map((appointment, index) => {
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

                {/* Loading indicator at the bottom for infinite scroll */}
                <div ref={activityEndRef} className="py-2 text-center">
                  {loading && <p className="text-sm text-gray-500">Loading more...</p>}
                </div>

                {!showMoreActivity && appointmentsActivity.length >= 10 && (
                  <Button 
                    variant="outline" 
                    onClick={loadMoreAppointments}
                    className="w-full flex items-center justify-center"
                  >
                    Load More <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground">No appointment activity</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Today's Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today's next appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {todayLoading ? (
              <div className="flex justify-center py-8">
                <p className="text-muted-foreground">Loading today's appointments...</p>
              </div>
            ) : todayAppointments.length > 0 ? (
              <div className="space-y-4">
                {todayAppointments.map((appointment) => {
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
          </CardContent>
        </Card>
      </div>
      
      {/* Business Performance Metrics */}
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
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Revenue</span>
                </div>
                <Button variant="ghost" size="icon" asChild>
                  <a href="#"><Info className="h-4 w-4" /></a>
                </Button>
              </div>
              <div className="text-3xl font-bold mb-2">
                ₹{businessMetrics?.revenue || "0.00"}
              </div>
              <div className={`text-sm flex items-center ${!businessMetrics?.revenueChange || parseFloat(businessMetrics?.revenueChange) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                {!businessMetrics?.revenueChange || parseFloat(businessMetrics?.revenueChange) < 0 ? (
                  <TrendingDown className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingUp className="h-4 w-4 mr-1" />
                )}
                {!businessMetrics?.revenueChange ? "0.00" : 
                 parseFloat(businessMetrics?.revenueChange) < 0 ? businessMetrics?.revenueChange : `+${businessMetrics?.revenueChange}`}% vs Yesterday
              </div>
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
                  <a href="#"><Info className="h-4 w-4" /></a>
                </Button>
              </div>
              <div className="text-3xl font-bold mb-2">
                {businessMetrics?.occupancyRate || "0.00"}%
              </div>
              <div className={`text-sm flex items-center ${!businessMetrics?.occupancyChange || parseFloat(businessMetrics?.occupancyChange) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                {!businessMetrics?.occupancyChange || parseFloat(businessMetrics?.occupancyChange) < 0 ? (
                  <TrendingDown className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingUp className="h-4 w-4 mr-1" />
                )}
                {!businessMetrics?.occupancyChange ? "0.00" : 
                 parseFloat(businessMetrics?.occupancyChange) < 0 ? businessMetrics?.occupancyChange : `+${businessMetrics?.occupancyChange}`}% vs Yesterday
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
                {businessMetrics?.returningCustomerRate || "0.00"}%
              </div>
              <div className={`text-sm flex items-center ${!businessMetrics?.returningCustomerChange || parseFloat(businessMetrics?.returningCustomerChange) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                {!businessMetrics?.returningCustomerChange || parseFloat(businessMetrics?.returningCustomerChange) < 0 ? (
                  <TrendingDown className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingUp className="h-4 w-4 mr-1" />
                )}
                {!businessMetrics?.returningCustomerChange ? "0.00" : 
                 parseFloat(businessMetrics?.returningCustomerChange) < 0 ? businessMetrics?.returningCustomerChange : `+${businessMetrics?.returningCustomerChange}`}% vs Yesterday
              </div>
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
                ₹{businessMetrics?.tips || "0.00"}
              </div>
              <div className="text-sm flex items-center text-gray-500">
                {businessMetrics?.tipsChange || "--"} vs Yesterday
              </div>
            </CardContent>
          </Card>
        </div>
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
    </div>
  );
}
