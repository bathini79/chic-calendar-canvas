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
import { useRecentSales } from "@/hooks/use-recent-sales";

const LazyStatsPanel = React.lazy(() => import('./bookings/components/StatsPanel').then(module => ({ default: module.StatsPanel })));

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

  const getRecentSalesDays = useMemo(() => {
    switch (timeRange) {
      case "today": return 1;
      case "week": return 7;
      case "month": return 30;
      case "year": return 365;
      default: return 1;
    }
  }, [timeRange]);

  const { 
    sales: recentSales, 
    isLoading: isRecentSalesLoading 
  } = useRecentSales(getRecentSalesDays, 50);

  useEffect(() => {
    if (!isRecentSalesLoading && recentSales.length > 0) {
      const groupedData = {};
      let total = 0;
      let completedTotal = 0;
      let completedCount = 0;
      let count = 0;

      recentSales.forEach(sale => {
        let date;
        const createdAt = sale.type === 'appointment' ? sale.created_at : sale.sale_date;
        
        if (timeRange === "today") {
          date = format(new Date(createdAt), "HH:mm");
        } else if (timeRange === "week") {
          date = format(new Date(createdAt), "EEE");
        } else {
          date = format(new Date(createdAt), "MMM-dd");
        }
        
        if (!groupedData[date]) {
          groupedData[date] = {
            date,
            sales: 0,
            appointments: 0
          };
        }
        
        const amount = sale.type === 'appointment' ? sale.total_price : sale.total_amount;
        
        groupedData[date].sales += amount || 0;
        groupedData[date].appointments += 1;
        total += amount || 0;
        count += 1;
        
        if (sale.type === 'appointment') {
          completedTotal += amount || 0;
          completedCount += 1;
        } else {
          completedTotal += amount || 0;
          completedCount += 1;
        }
      });

      const chartData = Object.values(groupedData);
      setRevenueData(chartData);
      setTotalRevenue(total);
      
      setAppointmentsStats({
        count: count,
        value: total,
        completed: completedCount,
        completedValue: completedTotal
      });
    }
  }, [recentSales, isRecentSalesLoading, timeRange]);

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
      
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("id, name");
      
      if (servicesError) throw servicesError;
      
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
      
      if (topServicesLocationId !== "all") {
        const { data: thisMonthAppointments, error: thisMonthAppError } = await supabase
          .from("appointments")
          .select("id")
          .eq("location", topServicesLocationId)
          .gte("created_at", firstDayThisMonth.toISOString())
          .lte("created_at", lastDayThisMonth.toISOString());
        
        if (thisMonthAppError) throw thisMonthAppError;
        
        const { data: lastMonthAppointments, error: lastMonthAppError } = await supabase
          .from("appointments")
          .select("id")
          .eq("location", topServicesLocationId)
          .gte("created_at", firstDayLastMonth.toISOString())
          .lte("created_at", lastDayLastMonth.toISOString());
        
        if (lastMonthAppError) throw lastMonthAppError;
        
        const thisMonthAppIds = thisMonthAppointments.map(app => app.id);
        const lastMonthAppIds = lastMonthAppointments.map(app => app.id);
        
        if (thisMonthAppIds.length > 0) {
          thisMonthQuery = thisMonthQuery.in("appointment_id", thisMonthAppIds);
        } else {
          thisMonthQuery = thisMonthQuery.eq("appointment_id", "no-results");
        }
        
        if (lastMonthAppIds.length > 0) {
          lastMonthQuery = lastMonthQuery.in("appointment_id", lastMonthAppIds);
        } else {
          lastMonthQuery = lastMonthQuery.eq("appointment_id", "no-results");
        }
      }
      
      const [thisMonthResult, lastMonthResult] = await Promise.all([
        thisMonthQuery,
        lastMonthQuery
      ]);
      
      const thisMonthError = thisMonthResult.error;
      const lastMonthError = lastMonthResult.error;
      const thisMonthData = thisMonthResult.data || [];
      const lastMonthData = lastMonthResult.data || [];
      
      if (thisMonthError || lastMonthError) throw thisMonthError || lastMonthError;
      
      const serviceMap = {};
      servicesData.forEach(service => {
        serviceMap[service.id] = service.name;
      });
      
      const thisMonthCounts = {};
      thisMonthData.forEach(booking => {
        if (booking.service_id && serviceMap[booking.service_id]) {
          const serviceName = serviceMap[booking.service_id];
          thisMonthCounts[serviceName] = (thisMonthCounts[serviceName] || 0) + 1;
        }
      });
      
      const lastMonthCounts = {};
      lastMonthData.forEach(booking => {
        if (booking.service_id && serviceMap[booking.service_id]) {
          const serviceName = serviceMap[booking.service_id];
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
      
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select("id, name")
        .eq("employment_type", "stylist");
      
      if (employeesError) throw employeesError;
      
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
        const { data: thisMonthAppointments, error: thisMonthAppError } = await supabase
          .from("appointments")
          .select("id")
          .eq("location", topStylistsLocationId)
          .gte("created_at", firstDayThisMonth.toISOString())
          .lte("created_at", lastDayThisMonth.toISOString());
        
        if (thisMonthAppError) throw thisMonthAppError;
        
        const { data: lastMonthAppointments, error: lastMonthAppError } = await supabase
          .from("appointments")
          .select("id")
          .eq("location", topStylistsLocationId)
          .gte("created_at", firstDayLastMonth.toISOString())
          .lte("created_at", lastDayLastMonth.toISOString());
        
        if (lastMonthAppError) throw lastMonthAppError;
        
        const thisMonthAppIds = thisMonthAppointments.map(app => app.id);
        const lastMonthAppIds = lastMonthAppointments.map(app => app.id);
        
        if (thisMonthAppIds.length > 0) {
          thisMonthQuery = thisMonthQuery.in("appointment_id", thisMonthAppIds);
        } else {
          thisMonthQuery = thisMonthQuery.eq("appointment_id", "no-results");
        }
        
        if (lastMonthAppIds.length > 0) {
          lastMonthQuery = lastMonthQuery.in("appointment_id", lastMonthAppIds);
        } else {
          lastMonthQuery = lastMonthQuery.eq("appointment_id", "no-results");
        }
      }
      
      const [thisMonthResult, lastMonthResult] = await Promise.all([
        thisMonthQuery,
        lastMonthQuery
      ]);
      
      const thisMonthError = thisMonthResult.error;
      const lastMonthError = lastMonthResult.error;
      const thisMonthData = thisMonthResult.data || [];
      const lastMonthData = lastMonthResult.data || [];
      
      if (thisMonthError || lastMonthError) throw thisMonthError || lastMonthError;
      
      const employeeMap = {};
      employeesData.forEach(employee => {
        employeeMap[employee.id] = employee.name;
      });
      
      const thisMonthRevenue = {};
      thisMonthData.forEach(booking => {
        if (booking.employee_id && employeeMap[booking.employee_id]) {
          const stylistName = employeeMap[booking.employee_id];
          thisMonthRevenue[stylistName] = (thisMonthRevenue[stylistName] || 0) + (booking.price_paid || 0);
        }
      });
      
      const lastMonthRevenue = {};
      lastMonthData.forEach(booking => {
        if (booking.employee_id && employeeMap[booking.employee_id]) {
          const stylistName = employeeMap[booking.employee_id];
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
      setTopStylists([]);
    }
  }, [topStylistsLocationId]);

  const fetchBusinessMetrics = useCallback(async () => {
    try {
      const revenue = totalRevenue;
      
      const startDate = getStartDateForTimeRange(timeRange);
      const yesterday = subDays(today, 1);
      
      let empQuery = supabase
        .from("employees")
        .select("*")
        .eq("employment_type", "stylist");
      
      if (recentSalesLocationId !== "all") {
        empQuery = supabase
          .from("employee_locations")
          .select(`
            employee_id
          `)
          .eq("location_id", recentSalesLocationId);
      }
      
      const { data: employees, error: empError } = await empQuery;
      
      if (empError) throw empError;
      
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
      
      const employeeCount = recentSalesLocationId !== "all" 
        ? (employees?.length || 0)
        : (employees?.length || 0);
        
      const occupancyRate = employeeCount > 0 ? (currentAppointments.length / employeeCount) * 100 : 0;
      const revenueChange = (revenue - totalRevenue) / totalRevenue * 100;
      const occupancyChange = (occupancyRate - businessMetrics.occupancyRate) / businessMetrics.occupancyRate * 100;
      const returningCustomerChange = (currentAppointments.filter(app => app.status === 'completed').length - businessMetrics.returningCustomerRate) / businessMetrics.returningCustomerRate * 100;
      
      setBusinessMetrics({
        revenue: formatPrice(revenue),
        occupancyRate: occupancyRate.toFixed(2),
        returningCustomerRate: businessMetrics.returningCustomerRate,
        tips: businessMetrics.tips,
        revenueChange: revenueChange.toFixed(2),
        occupancyChange: occupancyChange.toFixed(2),
        returningCustomerChange: returningCustomerChange.toFixed(2),
        tipsChange: businessMetrics.tipsChange
      });
    } catch (error) {
      console.error("Error fetching business metrics:", error);
    }
  }, [timeRange, recentSalesLocationId, totalRevenue, today]);

  const fetchQuickActionsData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("quick_actions")
        .select("*");
      
      if (error) throw error;
      
      setQuickActions(data[0]);
    } catch (error) {
      console.error("Error fetching quick actions data:", error);
    }
  }, []);

  const handleDetailsClick = (appointmentId) => {
    setSelectedAppointment(appointmentId);
    setIsDetailsDialogOpen(true);
  };

  const handleAddAppointment = () => {
    setIsAddAppointmentOpen(true);
  };

  const getStartDateForTimeRange = (range) => {
    switch (range) {
      case "today":
        return startOfDay(today);
      case "week":
        return subDays(new Date(), 7);
      case "month":
        return subDays(new Date(), 30);
      case "year":
        return subDays(new Date(), 365);
      default:
        return startOfDay(today);
    }
  };

  const renderAppointmentStatus = (status) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="mr-2 h-4 w-4" />;
      case 'canceled':
        return <XCircle className="mr-2 h-4 w-4" />;
      case 'booked':
        return <Clock className="mr-2 h-4 w-4" />;
      default:
        return <User className="mr-2 h-4 w-4" />;
    }
  };

  const renderTopServices = () => {
    return (
      <div>
        {topServices.map(service => (
          <div key={service.name} className="flex items-center mb-2">
            <div className="mr-2">{service.name}</div>
            <div className="flex items-center">
              <div className="mr-2">{service.thisMonth}</div>
              <div className="mr-2">{service.lastMonth}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTopStylists = () => {
    return (
      <div>
        {topStylists.map(stylist => (
          <div key={stylist.name} className="flex items-center mb-2">
            <div className="mr-2">{stylist.name}</div>
            <div className="flex items-center">
              <div className="mr-2">{stylist.thisMonth}</div>
              <div className="mr-2">{stylist.lastMonth}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Render components and logic */}
    </div>
  );
}
