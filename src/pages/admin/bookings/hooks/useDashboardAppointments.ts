
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfDay, endOfDay } from "date-fns";
import type { Appointment } from "../types";

// Helper function to fetch appointments with pagination
const fetchAppointmentsWithPagination = async ({
  statuses = [],
  startDate = null,
  endDate = null,
  page = 0,
  pageSize = 10,
  orderDirection = "ascending",
}) => {
  let query = supabase
    .from("appointments")
    .select(
      `
      *,
      bookings (
        *,
        service:services (*),
        package:packages (*),
        employee:employees!bookings_employee_id_fkey (
          id,
          name,
          email,
          phone,
          photo_url,
          employment_type,
          status
        )
      ),
      customer:profiles (
        id,
        full_name,
        email,
        phone_number,
        role,
        created_at,
        updated_at
      )
    `
    )
    .order("start_time", { ascending: orderDirection === "ascending" });

  // Apply status filter if specified
  if (statuses.length > 0) {
    query = query.in("status", statuses);
  }

  // Apply date filters if specified
  if (startDate) {
    query = query.gte("start_time", startDate.toISOString());
  }

  if (endDate) {
    query = query.lte("start_time", endDate.toISOString());
  }

  // Apply pagination
  if (pageSize > 0) {
    query = query.range(page * pageSize, (page + 1) * pageSize - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching appointments:", error);
    throw error;
  }

  return data as Appointment[];
};

// Hook for upcoming appointments (statuses: confirmed, booked)
export const useUpcomingAppointments = (limit = 5) => {
  return useQuery({
    queryKey: ["upcomingAppointments", limit],
    queryFn: async () => {
      const today = new Date();
      return fetchAppointmentsWithPagination({
        statuses: ["confirmed", "booked"],
        startDate: today,
        pageSize: limit,
        orderDirection: "ascending",
      });
    },
  });
};

// Hook for today's appointments
export const useTodayAppointments = () => {
  return useQuery({
    queryKey: ["todayAppointments"],
    queryFn: async () => {
      const today = new Date();
      const start = startOfDay(today);
      const end = endOfDay(today);
      
      return fetchAppointmentsWithPagination({
        startDate: start,
        endDate: end,
        orderDirection: "ascending",
        pageSize: 100, // High enough to get all for today
      });
    },
  });
};

// Hook for appointment activity with pagination
export const useAppointmentsActivity = (page = 0, pageSize = 10) => {
  return useQuery({
    queryKey: ["appointmentsActivity", page, pageSize],
    queryFn: async () => {
      return fetchAppointmentsWithPagination({
        page,
        pageSize,
        orderDirection: "descending",
      });
    },
    keepPreviousData: true,
  });
};

// Hook for performance metrics
export const usePerformanceMetrics = (dateRange = "month") => {
  return useQuery({
    queryKey: ["performanceMetrics", dateRange],
    queryFn: async () => {
      // Calculate date range
      const today = new Date();
      let startDate;
      
      if (dateRange === "day") {
        startDate = startOfDay(today);
      } else if (dateRange === "week") {
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        startDate = lastWeek;
      } else if (dateRange === "month") {
        const lastMonth = new Date(today);
        lastMonth.setMonth(today.getMonth() - 1);
        startDate = lastMonth;
      } else {
        const lastYear = new Date(today);
        lastYear.setFullYear(today.getFullYear() - 1);
        startDate = lastYear;
      }

      // Fetch all appointments in date range for metrics calculation
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
          *,
          bookings (
            *,
            employee:employees!bookings_employee_id_fkey (id, name)
          ),
          customer:profiles (id, full_name)
        `)
        .gte("start_time", startDate.toISOString())
        .lte("start_time", today.toISOString());

      if (error) throw error;

      // Fetch unique customers for returning customer calculation
      const { data: uniqueCustomers, error: customerError } = await supabase
        .from("profiles")
        .select('id, created_at')
        .eq('role', 'customer');
      
      if (customerError) throw customerError;

      // Calculate metrics
      const totalAppointments = appointments ? appointments.length : 0;
      const totalRevenue = appointments ? appointments.reduce((sum, app) => sum + (app.total_price || 0), 0) : 0;
      
      // Calculate booked vs. available time slots for occupancy rate
      const { data: employees, error: employeeError } = await supabase
        .from("employees")
        .select('id')
        .eq('status', 'active');
      
      if (employeeError) throw employeeError;
      
      // Assuming 8-hour work days for all active employees
      const availableHoursPerDay = 8;
      const workingDays = dateRange === 'day' ? 1 : 
                          dateRange === 'week' ? 7 : 
                          dateRange === 'month' ? 30 : 365;
      
      const totalAvailableHours = employees.length * availableHoursPerDay * workingDays;
      
      // Calculate total booked hours from appointments
      const totalBookedHours = appointments ? appointments.reduce((sum, app) => {
        const durationHours = app.total_duration / 60; // Convert minutes to hours
        return sum + durationHours;
      }, 0) : 0;
      
      // Calculate occupancy rate
      const occupancyRate = totalAvailableHours > 0 ? (totalBookedHours / totalAvailableHours) * 100 : 0;
      
      // Calculate returning customer rate
      // For simplicity, we'll count how many customers have appointments in the period
      // vs how many new customers were created in the period
      const customersWithAppointments = new Set();
      appointments?.forEach(app => {
        if (app.customer_id) {
          customersWithAppointments.add(app.customer_id);
        }
      });
      
      // Count new customers created during this period
      const newCustomersCount = uniqueCustomers.filter(
        c => new Date(c.created_at) >= startDate
      ).length;
      
      // Calculate returning customer rate
      // (total customers with appointments - new customers) / total customers with appointments
      const returningCustomerRate = customersWithAppointments.size > 0 
        ? ((customersWithAppointments.size - newCustomersCount) / customersWithAppointments.size) * 100
        : 0;
      
      return {
        totalAppointments,
        totalRevenue,
        occupancyRate: Math.min(occupancyRate, 100), // Cap at 100%
        returningCustomerRate,
      };
    },
  });
};
