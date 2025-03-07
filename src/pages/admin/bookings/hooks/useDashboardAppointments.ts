
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay, addDays, subDays } from "date-fns";
import type { Appointment } from "../types";

// Hook for fetching upcoming appointments
export const useUpcomingAppointments = (limit: number = 5) => {
  return useQuery({
    queryKey: ["upcoming-appointments", limit],
    queryFn: async () => {
      const today = new Date();
      const nextWeek = addDays(today, 7);

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id, 
          start_time, 
          end_time, 
          status,
          customer:profiles (id, full_name),
          bookings (
            id,
            service:services (id, name, duration),
            package:packages (id, name),
            employee:employees (id, name)
          )
        `)
        .in("status", ["confirmed", "booked"])
        .gte("start_time", today.toISOString())
        .lte("start_time", nextWeek.toISOString())
        .order("start_time", { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data as Appointment[];
    }
  });
};

// Hook for fetching today's appointments
export const useTodayAppointments = () => {
  return useQuery({
    queryKey: ["today-appointments"],
    queryFn: async () => {
      const today = startOfDay(new Date());
      const tomorrow = endOfDay(today);

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
            service:services (id, name, duration),
            package:packages (id, name),
            employee:employees (id, name)
          )
        `)
        .gte("start_time", today.toISOString())
        .lte("start_time", tomorrow.toISOString())
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data as Appointment[];
    }
  });
};

// Hook for fetching appointment activity
export const useAppointmentActivity = (limit: number = 10) => {
  return useQuery({
    queryKey: ["appointment-activity", limit],
    queryFn: async () => {
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
        .limit(limit);

      if (error) throw error;
      return data as Appointment[];
    }
  });
};

// Hook for calculating business metrics
export const useBusinessMetrics = () => {
  return useQuery({
    queryKey: ["business-metrics"],
    queryFn: async () => {
      // Calculate date ranges
      const today = new Date();
      const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const yesterday = subDays(today, 1);
      
      // Get appointments for calculation
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select(`
          id, 
          start_time, 
          end_time,
          status,
          total_price,
          customer_id,
          total_duration
        `)
        .gte("created_at", firstDayThisMonth.toISOString());
      
      if (appointmentsError) throw appointmentsError;
      
      // Get all customer data for returning customer calculation
      const { data: customersData, error: customersError } = await supabase
        .from("profiles")
        .select("id, created_at")
        .eq("role", "customer");
      
      if (customersError) throw customersError;
      
      // Calculate metrics
      
      // 1. Revenue
      const todayRevenue = appointmentsData
        .filter(app => new Date(app.created_at).toDateString() === today.toDateString())
        .reduce((sum, app) => sum + (app.total_price || 0), 0);
      
      const yesterdayRevenue = appointmentsData
        .filter(app => new Date(app.created_at).toDateString() === yesterday.toDateString())
        .reduce((sum, app) => sum + (app.total_price || 0), 0);
      
      // 2. Occupancy rate
      // Assuming 8 working hours per day and 3 stylists on average (simplified calculation)
      const workingHoursPerDay = 8; // hours
      const averageStylists = 3;
      const totalAvailableMinutesPerDay = workingHoursPerDay * 60 * averageStylists;
      
      const todayBookedMinutes = appointmentsData
        .filter(app => new Date(app.start_time).toDateString() === today.toDateString())
        .reduce((sum, app) => sum + (app.total_duration || 0), 0);
      
      const yesterdayBookedMinutes = appointmentsData
        .filter(app => new Date(app.start_time).toDateString() === yesterday.toDateString())
        .reduce((sum, app) => sum + (app.total_duration || 0), 0);
      
      const todayOccupancyRate = (todayBookedMinutes / totalAvailableMinutesPerDay) * 100;
      const yesterdayOccupancyRate = (yesterdayBookedMinutes / totalAvailableMinutesPerDay) * 100;
      
      // 3. Returning customer rate
      // Count customers with more than one appointment
      const customerAppointmentCounts = {};
      appointmentsData.forEach(app => {
        customerAppointmentCounts[app.customer_id] = (customerAppointmentCounts[app.customer_id] || 0) + 1;
      });
      
      const returningCustomers = Object.values(customerAppointmentCounts).filter(count => count > 1).length;
      const totalCustomers = customersData.length;
      const returningCustomerRate = (returningCustomers / totalCustomers) * 100;
      
      // For demonstration, we'll use a slightly different value for yesterday
      const yesterdayReturningCustomerRate = returningCustomerRate - 2;
      
      // Calculate percentage changes
      const revenueChange = yesterdayRevenue > 0 
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
        : 0;
      
      const occupancyChange = yesterdayOccupancyRate > 0 
        ? ((todayOccupancyRate - yesterdayOccupancyRate) / yesterdayOccupancyRate) * 100 
        : 0;
        
      const returningCustomerChange = yesterdayReturningCustomerRate > 0 
        ? ((returningCustomerRate - yesterdayReturningCustomerRate) / yesterdayReturningCustomerRate) * 100 
        : 0;
      
      return {
        revenue: todayRevenue.toFixed(2),
        occupancyRate: todayOccupancyRate.toFixed(2),
        returningCustomerRate: returningCustomerRate.toFixed(2),
        tips: "0.00", // Mock value since we don't have tips data
        revenueChange: revenueChange.toFixed(2),
        occupancyChange: occupancyChange.toFixed(2),
        returningCustomerChange: returningCustomerChange.toFixed(2),
        tipsChange: "--"
      };
    }
  });
};

// Hook for fetching quick actions data
export const useQuickActionsData = () => {
  return useQuery({
    queryKey: ["quick-actions-data"],
    queryFn: async () => {
      // Calculate date ranges
      const today = startOfDay(new Date());
      const tomorrow = startOfDay(addDays(today, 1));
      const nextWeek = startOfDay(addDays(today, 7));
      
      // Pending confirmations
      const { data: pendingConfirmations, error: pendingError } = await supabase
        .from("appointments")
        .select("id")
        .eq("status", "pending");

      // Today's bookings
      const { data: todayBookings, error: todayError } = await supabase
        .from("appointments")
        .select("id")
        .gte("start_time", today.toISOString())
        .lt("start_time", tomorrow.toISOString());
      
      // Upcoming bookings
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
      
      return {
        pendingConfirmations: pendingConfirmations?.length || 0,
        todayBookings: todayBookings?.length || 0,
        upcomingBookings: upcomingBookings?.length || 0,
        lowStockItems: lowStockItems?.length || 0
      };
    }
  });
};
