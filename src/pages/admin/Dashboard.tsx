
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { format, subDays, isToday, addDays, parseISO, startOfDay, endOfDay, subMonths, subYears } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  MoreHorizontal, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MapPin,
  TrendingDown, 
  TrendingUp, 
  Percent, 
  User, 
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
} from "recharts";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { StatsPanel } from "./bookings/components/StatsPanel";
import { Appointment } from "./bookings/types";
import { AppointmentDetailsDialog } from "./bookings/components/AppointmentDetailsDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppointmentManager } from "./bookings/components/AppointmentManager";
import { useAppointmentsByDate } from "./bookings/hooks/useAppointmentsByDate";
import { formatPrice } from "@/lib/utils";

const LazyStatsPanel = React.lazy(() => import('./bookings/components/StatsPanel').then(module => ({ default: module.StatsPanel })));

// Location selector component for reuse
const LocationSelector = ({ locations, value, onChange, className = "" }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className={`w-[180px] ${className}`}>
      <div className="flex items-center">
        <MapPin className="mr-2 h-4 w-4" />
        <SelectValue placeholder="All Locations" />
      </div>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Locations</SelectItem>
      {locations?.map(location => (
        <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState("today");
  const [revenueData, setRevenueData] = useState([]);
  const [appointmentsStats, setAppointmentsStats] = useState({
    count: 0,
    value: 0,
    completed: 0,
    completedValue: 0
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
  const [lowStockItems, setLowStockItems] = useState({
    count: 0,
    criticalCount: 0,
    totalItems: 0
  });

  // Location state variables
  const [locations, setLocations] = useState([]);
  const [recentSalesLocationId, setRecentSalesLocationId] = useState("all");
  const [todayAppointmentsLocationId, setTodayAppointmentsLocationId] = useState("all");
  const [upcomingAppointmentsLocationId, setUpcomingAppointmentsLocationId] = useState("all");
  const [inventoryLocationId, setInventoryLocationId] = useState("all");
  const [topServicesLocationId, setTopServicesLocationId] = useState("all");
  const [topStylistsLocationId, setTopStylistsLocationId] = useState("all");

  const today = new Date();
  const { data: todayAppointmentsData = [], isLoading: isTodayAppointmentsLoading, refetch: refetchTodayAppointments } = 
    useAppointmentsByDate(today, todayAppointmentsLocationId !== "all" ? todayAppointmentsLocationId : undefined);

  useEffect(() => {
    fetchLocations();
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [
    timeRange, 
    recentSalesLocationId, 
    upcomingAppointmentsLocationId, 
    inventoryLocationId,
    topServicesLocationId,
    topStylistsLocationId
  ]);

  useEffect(() => {
    refetchTodayAppointments();
  }, [todayAppointmentsLocationId, refetchTodayAppointments]);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .eq("status", "active");
      
      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error fetching locations:", error);
      toast.error("Failed to load locations");
    }
  };

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

  const fetchLowStockItems = useCallback(async () => {
    try {
      if (inventoryLocationId === "all") {
        // For all locations, query from inventory_items
        const { data, error } = await supabase
          .from("inventory_items")
          .select("id, quantity, minimum_quantity");
          
        if (error) throw error;
  
        const totalItems = data.length;
        const lowStockCount = data.filter(item => 
          item.quantity <= item.minimum_quantity).length;
        const criticalCount = data.filter(item => 
          item.quantity <= item.minimum_quantity * 0.5).length;
        
        setLowStockItems({
          count: lowStockCount,
          criticalCount,
          totalItems
        });
      } else {
        // For specific location, query from inventory_location_items
        const { data, error } = await supabase
          .from("inventory_location_items")
          .select("id, quantity, minimum_quantity")
          .eq("location_id", inventoryLocationId);
          
        if (error) throw error;
  
        const totalItems = data.length;
        const lowStockCount = data.filter(item => 
          item.quantity <= item.minimum_quantity).length;
        const criticalCount = data.filter(item => 
          item.quantity <= item.minimum_quantity * 0.5).length;
        
        setLowStockItems({
          count: lowStockCount,
          criticalCount,
          totalItems
        });
      }
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      setLowStockItems({
        count: 0,
        criticalCount: 0,
        totalItems: 0
      });
    }
  }, [inventoryLocationId]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchRevenueData(),
        fetchUpcomingAppointments(),
        fetchAppointmentsActivity(),
        fetchTopServices(),
        fetchTopStylists(),
        fetchBusinessMetrics(),
        fetchQuickActionsData(),
        fetchLowStockItems()
      ]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRevenueData = useCallback(async () => {
    let startDate;
    switch (timeRange) {
      case "today":
        startDate = startOfDay(today);
        break;
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
        startDate = startOfDay(today);
    }

    try {
      let query = supabase
        .from("appointments")
        .select("id, total_price, created_at, status")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });
      
      if (recentSalesLocationId !== "all") {
        query = query.eq("location", recentSalesLocationId);
      }
      
      const { data, error } = await query;

      if (error) throw error;

      const groupedData = {};
      let total = 0;
      let completedTotal = 0;
      let completedCount = 0;

      data.forEach(appointment => {
        let date;
        if (timeRange === "today") {
          date = format(new Date(appointment.created_at), "HH:mm");
        } else if (timeRange === "week") {
          date = format(new Date(appointment.created_at), "EEE");
        } else {
          date = format(new Date(appointment.created_at), "MMM-dd");
        }
        
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
        
        // Count completed appointments separately
        if (appointment.status === 'completed') {
          completedTotal += appointment.total_price || 0;
          completedCount += 1;
        }
      });

      const chartData = Object.values(groupedData);
      setRevenueData(chartData);
      setTotalRevenue(total);
      
      setAppointmentsStats({
        count: data.length,
        value: data.reduce((sum, app) => sum + (app.total_price || 0), 0),
        completed: completedCount,
        completedValue: completedTotal
      });
    } catch (error) {
      console.error("Error fetching revenue data:", error);
      setRevenueData([]);
      setTotalRevenue(0);
      setAppointmentsStats({
        count: 0,
        value: 0,
        completed: 0,
        completedValue: 0
      });
    }
  }, [timeRange, recentSalesLocationId, today]);

  const fetchUpcomingAppointments = useCallback(async () => {
    try {
      const tomorrow = addDays(new Date(), 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const nextWeek = addDays(tomorrow, 7);
      nextWeek.setHours(23, 59, 59, 999);
      
      let query = supabase
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
      
      if (upcomingAppointmentsLocationId !== "all") {
        query = query.eq("location", upcomingAppointmentsLocationId);
      }

      const { data, error } = await query;

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
      setUpcomingAppointments([]);
      setUpcomingAppointmentsChart([]);
      setUpcomingStats({
        total: 0,
        confirmed: 0,
        booked: 0,
        cancelled: 0
      });
    }
  }, [upcomingAppointmentsLocationId]);

  const fetchAppointmentsActivity = useCallback(async () => {
    try {
      let query = supabase
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
            employee:employees!bookings_employee_id_fkey (id, name)
          )
        `)
        .order("start_time", { ascending: false })
        .limit(10);
      
      if (todayAppointmentsLocationId !== "all") {
        query = query.eq("location", todayAppointmentsLocationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAppointmentsActivity(data || []);
    } catch (error) {
      console.error("Error fetching appointments activity:", error);
      setAppointmentsActivity([]);
    }
  }, [todayAppointmentsLocationId]);

  const fetchTopServices = useCallback(async () => {
    try {
      const today = new Date();
      const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      
      // Always get services first
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("id, name");
      
      if (servicesError) throw servicesError;
      
      // Create query for this month's bookings
      let thisMonthQuery = supabase
        .from("bookings")
        .select(`
          service_id,
          created_at,
          appointment_id
        `)
        .gte("created_at", firstDayThisMonth.toISOString())
        .lte("created_at", lastDayThisMonth.toISOString())
        .not("service_id", "is", null);
      
      // Create query for last month's bookings
      let lastMonthQuery = supabase
        .from("bookings")
        .select(`
          service_id,
          created_at,
          appointment_id
        `)
        .gte("created_at", firstDayLastMonth.toISOString())
        .lte("created_at", lastDayLastMonth.toISOString())
        .not("service_id", "is", null);
      
      // If location is selected, get appointment IDs for that location
      if (topServicesLocationId !== "all") {
        // Get appointments for the selected location (this month)
        const { data: thisMonthAppointments, error: thisMonthAppError } = await supabase
          .from("appointments")
          .select("id")
          .eq("location", topServicesLocationId)
          .gte("created_at", firstDayThisMonth.toISOString())
          .lte("created_at", lastDayThisMonth.toISOString());
        
        if (thisMonthAppError) throw thisMonthAppError;
        
        // Get appointments for the selected location (last month)
        const { data: lastMonthAppointments, error: lastMonthAppError } = await supabase
          .from("appointments")
          .select("id")
          .eq("location", topServicesLocationId)
          .gte("created_at", firstDayLastMonth.toISOString())
          .lte("created_at", lastDayLastMonth.toISOString());
        
        if (lastMonthAppError) throw lastMonthAppError;
        
        // Get appointment IDs
        const thisMonthAppIds = thisMonthAppointments.map(app => app.id);
        const lastMonthAppIds = lastMonthAppointments.map(app => app.id);
        
        // Filter bookings by these appointment IDs
        if (thisMonthAppIds.length > 0) {
          thisMonthQuery = thisMonthQuery.in("appointment_id", thisMonthAppIds);
        } else {
          // If no appointments match, return empty array for this month
          thisMonthQuery = thisMonthQuery.eq("appointment_id", "no-results");
        }
        
        if (lastMonthAppIds.length > 0) {
          lastMonthQuery = lastMonthQuery.in("appointment_id", lastMonthAppIds);
        } else {
          // If no appointments match, return empty array for last month
          lastMonthQuery = lastMonthQuery.eq("appointment_id", "no-results");
        }
      }
      
      // Execute both queries in parallel
      const [thisMonthResult, lastMonthResult] = await Promise.all([
        thisMonthQuery,
        lastMonthQuery
      ]);
      
      const thisMonthError = thisMonthResult.error;
      const lastMonthError = lastMonthResult.error;
      const thisMonthData = thisMonthResult.data || [];
      const lastMonthData = lastMonthResult.data || [];
      
      if (thisMonthError || lastMonthError) throw thisMonthError || lastMonthError;
      
      // Create a map of service_id to service name for easier lookup
      const serviceMap = {};
      servicesData.forEach(service => {
        serviceMap[service.id] = service.name;
      });
      
      // Calculate counts for current month
      const thisMonthCounts = {};
      thisMonthData.forEach(booking => {
        if (booking.service_id && serviceMap[booking.service_id]) {
          const serviceName = serviceMap[booking.service_id];
          thisMonthCounts[serviceName] = (thisMonthCounts[serviceName] || 0) + 1;
        }
      });
      
      // Calculate counts for last month
      const lastMonthCounts = {};
      lastMonthData.forEach(booking => {
        if (booking.service_id && serviceMap[booking.service_id]) {
          const serviceName = serviceMap[booking.service_id];
          lastMonthCounts[serviceName] = (lastMonthCounts[serviceName] || 0) + 1;
        }
      });
      
      // Create the final array with both months' data
      const servicesArray = Object.keys(thisMonthCounts).map(serviceName => ({
        name: serviceName,
        thisMonth: thisMonthCounts[serviceName],
        lastMonth: lastMonthCounts[serviceName] || 0
      }));
      
      // Sort by this month's bookings and take top 5
      servicesArray.sort((a, b) => b.thisMonth - a.thisMonth);
      setTopServices(servicesArray.slice(0, 5));
      
    } catch (error) {
      console.error("Error fetching top services:", error);
      setTopServices([]);
    }
  }, [topServicesLocationId]);

  const fetchTopStylists = useCallback(async () => {
    try {
      const today = new Date();
      const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      
      // Always get employees first
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select("id, name")
        .eq("employment_type", "stylist");
      
      if (employeesError) throw employeesError;
      
      // Create query for this month's bookings
      let thisMonthQuery = supabase
        .from("bookings")
        .select(`
          employee_id,
          price_paid,
          created_at,
          appointment_id
        `)
        .gte("created_at", firstDayThisMonth.toISOString())
        .lte("created_at", lastDayThisMonth.toISOString())
        .not("employee_id", "is", null);
      
      // Create query for last month's bookings
      let lastMonthQuery = supabase
        .from("bookings")
        .select(`
          employee_id,
          price_paid,
          created_at,
          appointment_id
        `)
        .gte("created_at", firstDayLastMonth.toISOString())
        .lte("created_at", lastDayLastMonth.toISOString())
        .not("employee_id", "is", null);
      
      // If location is selected, filter by appointments at that location
      if (topStylistsLocationId !== "all") {
        // Get appointments for the selected location (this month)
        const { data: thisMonthAppointments, error: thisMonthAppError } = await supabase
          .from("appointments")
          .select("id")
          .eq("location", topStylistsLocationId)
          .gte("created_at", firstDayThisMonth.toISOString())
          .lte("created_at", lastDayThisMonth.toISOString());
        
        if (thisMonthAppError) throw thisMonthAppError;
        
        // Get appointments for the selected location (last month)
        const { data: lastMonthAppointments, error: lastMonthAppError } = await supabase
          .from("appointments")
          .select("id")
          .eq("location", topStylistsLocationId)
          .gte("created_at", firstDayLastMonth.toISOString())
          .lte("created_at", lastDayLastMonth.toISOString());
        
        if (lastMonthAppError) throw lastMonthAppError;
        
        // Get appointment IDs
        const thisMonthAppIds = thisMonthAppointments.map(app => app.id);
        const lastMonthAppIds = lastMonthAppointments.map(app => app.id);
        
        // Filter bookings by these appointment IDs
        if (thisMonthAppIds.length > 0) {
          thisMonthQuery = thisMonthQuery.in("appointment_id", thisMonthAppIds);
        } else {
          // If no appointments match, return empty array for this month
          thisMonthQuery = thisMonthQuery.eq("appointment_id", "no-results");
        }
        
        if (lastMonthAppIds.length > 0) {
          lastMonthQuery = lastMonthQuery.in("appointment_id", lastMonthAppIds);
        } else {
          // If no appointments match, return empty array for last month
          lastMonthQuery = lastMonthQuery.eq("appointment_id", "no-results");
        }
      }
      
      // Execute both queries in parallel
      const [thisMonthResult, lastMonthResult] = await Promise.all([
        thisMonthQuery,
        lastMonthQuery
      ]);
      
      const thisMonthError = thisMonthResult.error;
      const lastMonthError = lastMonthResult.error;
      const thisMonthData = thisMonthResult.data || [];
      const lastMonthData = lastMonthResult.data || [];
      
      if (thisMonthError || lastMonthError) throw thisMonthError || lastMonthError;
      
      // Create a map of employee_id to employee name for easier lookup
      const employeeMap = {};
      employeesData.forEach(employee => {
        employeeMap[employee.id] = employee.name;
      });
      
      // Calculate revenue for current month
      const thisMonthRevenue = {};
      thisMonthData.forEach(booking => {
        if (booking.employee_id && employeeMap[booking.employee_id]) {
          const stylistName = employeeMap[booking.employee_id];
          thisMonthRevenue[stylistName] = (thisMonthRevenue[stylistName] || 0) + (booking.price_paid || 0);
        }
      });
      
      // Calculate revenue for last month
      const lastMonthRevenue = {};
      lastMonthData.forEach(booking => {
        if (booking.employee_id && employeeMap[booking.employee_id]) {
          const stylistName = employeeMap[booking.employee_id];
          lastMonthRevenue[stylistName] = (lastMonthRevenue[stylistName] || 0) + (booking.price_paid || 0);
        }
      });
      
      // Create the final array with both months' data
      const stylistsArray = Object.keys(thisMonthRevenue).map(stylistName => ({
        name: stylistName,
        thisMonth: thisMonthRevenue[stylistName],
        lastMonth: lastMonthRevenue[stylistName] || 0
      }));
      
      // Sort by this month's revenue and take top 5
      stylistsArray.sort((a, b) => b.thisMonth - a.thisMonth);
      setTopStylists(stylistsArray.slice(0, 5));
      
    } catch (error) {
      console.error("Error fetching top stylists:", error);
      setTopStylists([]);
    }
  }, [topStylistsLocationId]);

  const fetchBusinessMetrics = useCallback(async () => {
    try {
      // Calculate revenue
      const revenue = totalRevenue;
      
      // Calculate occupancy rate
      const startDate = getStartDateForTimeRange(timeRange);
      const yesterday = subDays(today, 1);
      
      // Get available employees (stylists)
      let empQuery = supabase
        .from("employees")
        .select("*")
        .eq("employment_type", "stylist");
      
      if (recentSalesLocationId !== "all") {
        // Filter employees by location if a specific location is selected
        empQuery = supabase
          .from("employee_locations")
          .select(`
            employee_id
          `)
          .eq("location_id", recentSalesLocationId);
      }
      
      const { data: employees, error: empError } = await empQuery;
      
      if (empError) throw empError;
      
      // Get appointments for current period
      let currentAppQuery = supabase
        .from("appointments")
        .select("*")
        .gte("start_time", startDate.toISOString())
        .lte("start_time", endOfDay(today).toISOString());
      
      if (recentSalesLocationId !== "all") {
        currentAppQuery = currentAppQuery.eq("location", recentSalesLocationId);
      }
      
      const { data: currentAppointments, error: currentAppError } = await currentAppQuery;
      
      if (currentAppError) throw currentAppError;
      
      // Get appointments for comparison period (yesterday, last week, or last month)
      let comparisonStartDate, comparisonEndDate;
      
      if (timeRange === "today") {
        comparisonStartDate = startOfDay(yesterday);
        comparisonEndDate = endOfDay(yesterday);
      } else if (timeRange === "week") {
        comparisonStartDate = subDays(startDate, 7);
        comparisonEndDate = subDays(endOfDay(today), 7);
      } else if (timeRange === "month") {
        comparisonStartDate = subMonths(startDate, 1);
        comparisonEndDate = subMonths(endOfDay(today), 1);
      } else {
        comparisonStartDate = subYears(startDate, 1);
        comparisonEndDate = subYears(endOfDay(today), 1);
      }
      
      let compAppQuery = supabase
        .from("appointments")
        .select("*")
        .gte("start_time", comparisonStartDate.toISOString())
        .lte("start_time", comparisonEndDate.toISOString());
      
      if (recentSalesLocationId !== "all") {
        compAppQuery = compAppQuery.eq("location", recentSalesLocationId);
      }
      
      const { data: comparisonAppointments, error: compAppError } = await compAppQuery;
      
      if (compAppError) throw compAppError;
      
      // Calculate occupancy rates
      const employeeCount = recentSalesLocationId !== "all" 
        ? (employees?.length || 1) 
        : (employees?.length || 1);
      const workingHoursPerDay = 8; // Assuming 8 working hours per day
      
      let totalPossibleSlots;
      let currentAppointmentHours = 0;
      let comparisonAppointmentHours = 0;
      
      if (timeRange === "today") {
        totalPossibleSlots = employeeCount * workingHoursPerDay;
      } else if (timeRange === "week") {
        totalPossibleSlots = employeeCount * workingHoursPerDay * 7;
      } else {
        // Month or year
        const daysInPeriod = timeRange === "month" ? 30 : 365;
        totalPossibleSlots = employeeCount * workingHoursPerDay * daysInPeriod;
      }
      
      // Calculate actual hours booked for current period
      currentAppointments?.forEach(app => {
        if (app.total_duration) {
          currentAppointmentHours += app.total_duration / 60; // Convert minutes to hours
        } else {
          // Estimate 1 hour if duration not specified
          currentAppointmentHours += 1;
        }
      });
      
      // Calculate actual hours booked for comparison period
      comparisonAppointments?.forEach(app => {
        if (app.total_duration) {
          comparisonAppointmentHours += app.total_duration / 60;
        } else {
          comparisonAppointmentHours += 1;
        }
      });
      
      const currentOccupancyRate = (currentAppointmentHours / totalPossibleSlots) * 100;
      const comparisonOccupancyRate = (comparisonAppointmentHours / totalPossibleSlots) * 100;
      
      const occupancyRateChange = currentOccupancyRate - comparisonOccupancyRate;
      
      // Calculate returning customer rate
      let currentCustQuery = supabase
        .from("appointments")
        .select("customer_id, location")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endOfDay(today).toISOString());
      
      if (recentSalesLocationId !== "all") {
        currentCustQuery = currentCustQuery.eq("location", recentSalesLocationId);
      }
      
      const { data: currentCustomerData, error: currentCustError } = await currentCustQuery;
      
      if (currentCustError) throw currentCustError;
      
      let compCustQuery = supabase
        .from("appointments")
        .select("customer_id, location")
        .gte("created_at", comparisonStartDate.toISOString())
        .lte("created_at", comparisonEndDate.toISOString());
      
      if (recentSalesLocationId !== "all") {
        compCustQuery = compCustQuery.eq("location", recentSalesLocationId);
      }
      
      const { data: comparisonCustomerData, error: compCustError } = await compCustQuery;
      
      if (compCustError) throw compCustError;
      
      // Count unique customers
      const currentUniqueCustomers = new Set(currentCustomerData?.map(a => a.customer_id) || []);
      const currentTotalCustomers = currentUniqueCustomers.size || 1;
      
      // Count repeat customers (those who have multiple appointments)
      const customerCount = {};
      currentCustomerData?.forEach(a => {
        customerCount[a.customer_id] = (customerCount[a.customer_id] || 0) + 1;
      });
      
      const currentReturningCustomers = Object.values(customerCount).filter(count => Number(count) > 1).length;
      const currentReturningRate = (currentReturningCustomers / currentTotalCustomers) * 100;
      
      // Do the same for comparison period
      const comparisonUniqueCustomers = new Set(comparisonCustomerData?.map(a => a.customer_id) || []);
      const comparisonTotalCustomers = comparisonUniqueCustomers.size || 1;
      
      const comparisonCustomerCount = {};
      comparisonCustomerData?.forEach(a => {
        comparisonCustomerCount[a.customer_id] = (comparisonCustomerCount[a.customer_id] || 0) + 1;
      });
      
      const comparisonReturningCustomers = Object.values(comparisonCustomerCount).filter(count => Number(count) > 1).length;
      const comparisonReturningRate = (comparisonReturningCustomers / comparisonTotalCustomers) * 100;
      
      const returningRateChange = currentReturningRate - comparisonReturningRate;
      
      // Calculate revenue change
      const comparisonRevenue = comparisonAppointments?.reduce((sum, app) => sum + (app.total_price || 0), 0) || 0;
      const revenueChange = comparisonRevenue > 0 ? ((revenue - comparisonRevenue) / comparisonRevenue) * 100 : 0;
      
      setBusinessMetrics({
        revenue: revenue.toFixed(2),
        occupancyRate: currentOccupancyRate.toFixed(2),
        returningCustomerRate: currentReturningRate.toFixed(2),
        tips: "0.00", // Not implemented yet
        revenueChange: revenueChange.toFixed(2),
        occupancyChange: occupancyRateChange.toFixed(2),
        returningCustomerChange: returningRateChange.toFixed(2),
        tipsChange: "--"
      });
    } catch (error) {
      console.error("Error calculating business metrics:", error);
      setBusinessMetrics({
        revenue: "0.00",
        occupancyRate: "0.00",
        returningCustomerRate: "0.00",
        tips: "0.00",
        revenueChange: "0.00",
        occupancyChange: "0.00",
        returningCustomerChange: "0.00",
        tipsChange: "--"
      });
    }
  }, [timeRange, recentSalesLocationId, totalRevenue, today]);
  
  const getStartDateForTimeRange = (range) => {
    switch (range) {
      case "today":
        return startOfDay(today);
      case "week":
        return subDays(today, 7);
      case "month":
        return subDays(today, 30);
      case "year":
        return subDays(today, 365);
      default:
        return startOfDay(today);
    }
  };

  const fetchQuickActionsData = useCallback(async () => {
    try {
      // Create queries
      const pendingQuery = supabase
        .from("appointments")
        .select("id")
        .eq("status", "pending");
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayBookingsQuery = supabase
        .from("appointments")
        .select("id")
        .gte("start_time", today.toISOString())
        .lt("start_time", tomorrow.toISOString());
      
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      
      const upcomingQuery = supabase
        .from("appointments")
        .select("id")
        .gt("start_time", tomorrow.toISOString())
        .lte("start_time", nextWeek.toISOString());
      
      // Apply location filters if needed
      if (todayAppointmentsLocationId !== "all") {
        pendingQuery.eq("location", todayAppointmentsLocationId);
        todayBookingsQuery.eq("location", todayAppointmentsLocationId);
      }
      
      if (upcomingAppointmentsLocationId !== "all") {
        upcomingQuery.eq("location", upcomingAppointmentsLocationId);
      }
      
      // Execute all queries in parallel
      const [pendingResult, todayResult, upcomingResult] = await Promise.all([
        pendingQuery,
        todayBookingsQuery,
        upcomingQuery
      ]);
      
      const pendingError = pendingResult.error;
      const todayError = todayResult.error;
      const upcomingError = upcomingResult.error;
      
      if (pendingError || todayError || upcomingError) 
        throw pendingError || todayError || upcomingError;
      
      // Get low stock items count
      const lowStockCount = lowStockItems.count;
      
      setQuickActions({
        pendingConfirmations: pendingResult.data?.length || 0,
        todayBookings: todayResult.data?.length || 0,
        upcomingBookings: upcomingResult.data?.length || 0,
        lowStockItems: lowStockCount
      });
    } catch (error) {
      console.error("Error fetching quick actions data:", error);
      setQuickActions({
        pendingConfirmations: 0,
        todayBookings: 0,
        upcomingBookings: 0,
        lowStockItems: 0
      });
    }
  }, [todayAppointmentsLocationId, upcomingAppointmentsLocationId, lowStockItems]);

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
      case "today":
        return "Today";
      case "week":
        return "Last 7 days";
      case "month":
        return "Last 30 days";
      case "year":
        return "Last 365 days";
      default:
        return "Today";
    }
  };

  const getComparisonLabel = () => {
    switch (timeRange) {
      case "today":
        return "vs Yesterday";
      case "week":
        return "vs Last Week";
      case "month":
        return "vs Last Month";
      case "year":
        return "vs Last Year";
      default:
        return "vs Yesterday";
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
      
      {/* First row: Recent sales and Today's next appointments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Recent sales</CardTitle>
              <CardDescription>{getTimeRangeLabel()}</CardDescription>
            </div>
            <div className="flex gap-2">
              <LocationSelector 
                value={recentSalesLocationId} 
                onChange={setRecentSalesLocationId}
                locations={locations}
              />
              <Select
                value={timeRange}
                onValueChange={setTimeRange}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-3xl font-bold text-gray-900">₹{appointmentsStats.completedValue.toFixed(2)}</div>
              <div>
                <div className="text-sm text-gray-500">Appointments {appointmentsStats.count}</div>
                <div className="text-lg font-semibold">Appointments value ₹{(appointmentsStats.value - appointmentsStats.completedValue).toFixed(2)}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 my-6">
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-600">Occupancy Rate</div>
                    <Percent className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="text-2xl font-bold text-indigo-700">{businessMetrics.occupancyRate}%</div>
                  <div className={`text-sm flex items-center mt-1 ${parseFloat(businessMetrics.occupancyChange) < 0 ? 'text-red-500' : 'text-green-500'} font-medium`}>
                    {parseFloat(businessMetrics.occupancyChange) < 0 ? (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    )}
                    {parseFloat(businessMetrics.occupancyChange) < 0 ? businessMetrics.occupancyChange : `+${businessMetrics.occupancyChange}`}% {getComparisonLabel()}
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-600">Returning Customer Rate</div>
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="text-2xl font-bold text-indigo-700">{businessMetrics.returningCustomerRate}%</div>
                  <div className={`text-sm flex items-center mt-1 ${parseFloat(businessMetrics.returningCustomerChange) < 0 ? 'text-red-500' : 'text-green-500'} font-medium`}>
                    {parseFloat(businessMetrics.returningCustomerChange) < 0 ? (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    )}
                    {parseFloat(businessMetrics.returningCustomerChange) < 0 ? businessMetrics.returningCustomerChange : `+${businessMetrics.returningCustomerChange}`}% {getComparisonLabel()}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="h-[300px] mt-6">
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
        
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Today's next appointments</CardTitle>
            <LocationSelector 
              value={todayAppointmentsLocationId} 
              onChange={setTodayAppointmentsLocationId}
              locations={locations}
            />
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Today's Schedule</h2>
                <div className="space-x-1">
                  <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">Booked: {todayAppointmentsData.filter(a => a.status === 'booked').length}</span>
                  <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">Confirmed: {todayAppointmentsData.filter(a => a.status === 'confirmed').length}</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-1">Total appointments: {todayAppointmentsData.length}</p>
            </div>
            
            <ScrollArea className="h-[300px] pr-4">
              {isTodayAppointmentsLoading ? (
                <div className="flex justify-center items-center h-40">
                  <p>Loading appointments...</p>
                </div>
              ) : todayAppointmentsData.length > 0 ? (
                <div className="space-y-4">
                  {todayAppointmentsData.map((appointment) => {
                    const mainBooking = appointment.bookings?.[0];
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
      
      {/* Second row: Upcoming appointments and Inventory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <React.Suspense fallback={<div className="h-[400px] flex items-center justify-center">Loading...</div>}>
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Upcoming appointments</CardTitle>
              <LocationSelector 
                value={upcomingAppointmentsLocationId} 
                onChange={setUpcomingAppointmentsLocationId}
                locations={locations}
              />
            </CardHeader>
            <CardContent>
              {upcomingAppointmentsChart.length > 0 ? (
                <LazyStatsPanel 
                  stats={[]} 
                  chartData={upcomingAppointmentsChart}
                  totalBooked={upcomingStats.total}
                  confirmedCount={upcomingStats.confirmed}
                  bookedCount={upcomingStats.booked}
                  cancelledCount={upcomingStats.cancelled}
                />
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-xl font-semibold">Your schedule is empty</h3>
                  <p className="text-gray-500 mt-2">Make some appointments for schedule data to appear</p>
                </div>
              )}
            </CardContent>
          </Card>
        </React.Suspense>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Inventory Status</CardTitle>
            <div className="flex items-center justify-between gap-2">
              <LocationSelector 
                value={inventoryLocationId} 
                onChange={setInventoryLocationId}
                className="w-[160px]"
              locations={locations}

              />
              <Link to="/admin/inventory" className="text-sm text-blue-600 hover:underline flex items-center">
                View Inventory <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card p-4 rounded-lg border">
                <h3 className="font-medium mb-2 text-gray-500">Total Items</h3>
                <p className="text-2xl font-bold">{lowStockItems.totalItems || 0}</p>
              </div>
              <div className="bg-card p-4 rounded-lg border">
                <h3 className="font-medium mb-2 text-gray-500">Low Stock Items</h3>
                <Link to="/admin/inventory" className="text-2xl font-bold text-yellow-500 hover:text-yellow-600">
                  {lowStockItems.count || 0}
                </Link>
              </div>
              <div className="bg-card p-4 rounded-lg border">
                <h3 className="font-medium mb-2 text-gray-500">Critical Stock</h3>
                <Link to="/admin/inventory" className="text-2xl font-bold text-red-500 hover:text-red-600">
                  {lowStockItems.criticalCount || 0}
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Third row: Top services and Top team members */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Top services</CardTitle>
            <LocationSelector 
              value={topServicesLocationId} 
              onChange={setTopServicesLocationId}
              locations={locations}

            />
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Top team member</CardTitle>
            <LocationSelector 
              value={topStylistsLocationId} 
              onChange={setTopStylistsLocationId}
              locations={locations}

            />
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
                        <td className="py-3 text-right">{formatPrice(stylist.thisMonth)}</td>
                        <td className="py-3 text-right">{formatPrice(stylist.lastMonth)}</td>
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
      
      {/* Keep the appointment detail dialogs */}
      <AppointmentDetailsDialog 
        appointment={selectedAppointment}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        onUpdated={refetchTodayAppointments}
        onCheckout={handleCheckoutFromAppointment}
        onEdit={() => {
          handleCheckoutFromAppointment(selectedAppointment as Appointment);
        }}
      />

      {isAddAppointmentOpen && appointmentDate && (
        <AppointmentManager
          isOpen={true}
          onClose={closeAppointmentManager}
          selectedDate={appointmentDate}
          selectedTime={appointmentTime}
          employees={employees}
          existingAppointment={selectedAppointment}
          locationId={todayAppointmentsLocationId !== "all" ? todayAppointmentsLocationId : undefined}
        />
      )}

      <style>
        {`
          .widget-small {
            grid-column: span 1;
          }
          .widget-medium {
            grid-column: span 1;
          }
          .widget-large {
            grid-column: span 2;
          }
          @media (max-width: 768px) {
            .widget-large {
              grid-column: span 1;
            }
          }
        `}
      </style>
    </div>
  );
}

