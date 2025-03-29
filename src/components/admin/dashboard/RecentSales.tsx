
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Percent, TrendingDown, TrendingUp, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, subDays, endOfDay, subMonths, subYears } from "date-fns";
import { LocationSelector } from './LocationSelector';

export const RecentSales = ({ timeRange, setTimeRange, locations, recentSalesLocationId, setRecentSalesLocationId }) => {
  const [revenueData, setRevenueData] = useState([]);
  const [appointmentsStats, setAppointmentsStats] = useState({ count: 0, value: 0, completed: 0, completedValue: 0 });
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [businessMetrics, setBusinessMetrics] = useState({
    revenue: "0.00", occupancyRate: "0.00", returningCustomerRate: "0.00", tips: "0.00",
    revenueChange: "0.00", occupancyChange: "0.00", returningCustomerChange: "0.00", tipsChange: "--"
  });
  const [isLoading, setIsLoading] = useState(true);
  const today = new Date();

  const fetchRevenueData = useCallback(async () => {
    let startDate;
    switch (timeRange) {
      case "today": startDate = startOfDay(today); break;
      case "week": startDate = subDays(today, 7); break;
      case "month": startDate = subDays(today, 30); break;
      case "year": startDate = subDays(today, 365); break;
      default: startDate = startOfDay(today);
    }

    try {
      let query = supabase
        .from("appointments")
        .select("id, total_price, created_at, status")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });
      if (recentSalesLocationId !== "all") query = query.eq("location", recentSalesLocationId);
      
      const { data, error } = await query;
      if (error) throw error;

      const groupedData = {};
      let total = 0, completedTotal = 0, completedCount = 0;
      data.forEach(appointment => {
        let date;
        if (timeRange === "today") date = format(new Date(appointment.created_at), "HH:mm");
        else if (timeRange === "week") date = format(new Date(appointment.created_at), "EEE");
        else date = format(new Date(appointment.created_at), "MMM-dd");
        
        if (!groupedData[date]) groupedData[date] = { date, sales: 0, appointments: 0 };
        groupedData[date].sales += appointment.total_price || 0;
        groupedData[date].appointments += 1;
        total += appointment.total_price || 0;
        if (appointment.status === 'completed') {
          completedTotal += appointment.total_price || 0;
          completedCount += 1;
        }
      });
      setRevenueData(Object.values(groupedData));
      setTotalRevenue(total);
      setAppointmentsStats({ count: data.length, value: total, completed: completedCount, completedValue: completedTotal });
    } catch (error) {
      console.error("Error fetching revenue data:", error);
      setRevenueData([]);
      setTotalRevenue(0);
      setAppointmentsStats({ count: 0, value: 0, completed: 0, completedValue: 0 });
    }
  }, [timeRange, recentSalesLocationId, today]);
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

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchRevenueData(), fetchBusinessMetrics()])
      .finally(() => setIsLoading(false));
  }, [timeRange,recentSalesLocationId]);

  const getTimeRangeLabel = () => {
    return { "today": "Today", "week": "Last 7 days", "month": "Last 30 days", "year": "Last 365 days" }[timeRange] || "Today";
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 space-y-2 sm:space-y-0">
        <div>
          <CardTitle className="text-lg">Recent Sales</CardTitle>
          <CardDescription>{getTimeRangeLabel()}</CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <LocationSelector value={recentSalesLocationId} onChange={setRecentSalesLocationId} locations={locations} />
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-full sm:w-[120px]"><SelectValue placeholder="Select..." /></SelectTrigger>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Occupancy Rate</div>
                <Percent className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-indigo-700">{businessMetrics.occupancyRate}%</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Returning Customer Rate</div>
                <User className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-indigo-700">{businessMetrics.returningCustomerRate}%</div>
            </div>
          </div>
        </div>
        <div className="h-[300px] mt-6 overflow-x-auto overflow-y-auto">
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#8884d8" name="Sales" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="appointments" stroke="#82ca9d" name="Appointments" dot={{ r: 4 }} />
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
  );
};
