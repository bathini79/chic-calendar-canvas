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
      
      if (topStylistsLocationId !== "all") {
        // Get employees associated with this location
        const { data: employees, error: empError } = await supabase
          .from("employee_locations")
          .select(`
            employee_id,
            employee:employees(id, name)
          `)
          .eq("location_id", topStylistsLocationId);
        
        if (empError) throw empError;
        
        // Extract employee IDs
        const employeeIds = employees?.map(item => item.employee_id) || [];
        
        // If we have employee IDs, filter by them
        if (employeeIds.length > 0) {
          thisMonthQuery = thisMonthQuery.in("employee_id", employeeIds);
          lastMonthQuery = lastMonthQuery.in("employee_id", employeeIds);
        } else {
          // No employees at this location
          thisMonthQuery = thisMonthQuery.eq("employee_id", "no-results");
          lastMonthQuery = lastMonthQuery.eq("employee_id", "no-results");
        }
      } else {
        // No location filter, proceed with all employees
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
        comparisonCustomerCount[a
