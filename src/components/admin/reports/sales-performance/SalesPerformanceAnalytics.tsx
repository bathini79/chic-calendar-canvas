
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from "recharts";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay, subMonths } from 'date-fns';

type SalesPerformanceAnalyticsProps = {
  employeeId: string;
  dateRange: string;
};

export const SalesPerformanceAnalytics = ({ employeeId, dateRange }: SalesPerformanceAnalyticsProps) => {
  const { data: serviceTrends = [], isLoading: isServicesLoading } = useQuery({
    queryKey: ['service-trends', employeeId, dateRange],
    queryFn: async () => {
      const today = new Date();
      const days = parseInt(dateRange);
      const startDate = subDays(today, days).toISOString();
      
      let query = supabase
        .from('bookings')
        .select(`
          service_id,
          price_paid,
          created_at,
          services(name)
        `)
        .gte('created_at', startDate)
        .eq('status', 'completed');
      
      if (employeeId !== 'all') {
        query = query.eq('employee_id', employeeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const serviceMap = new Map<string, number>();
      
      // Process the data
      data.forEach((booking) => {
        if (!booking.service_id || !booking.services) return;
        
        const serviceName = booking.services.name;
        const price = booking.price_paid || 0;
        
        serviceMap.set(serviceName, (serviceMap.get(serviceName) || 0) + price);
      });
      
      // Convert to array and sort by sales
      return Array.from(serviceMap.entries())
        .map(([name, sales]) => ({ name, sales }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 10); // Top 10 services
    }
  });

  const { data: monthlySales = [], isLoading: isMonthlySalesLoading } = useQuery({
    queryKey: ['monthly-sales', employeeId],
    queryFn: async () => {
      const today = new Date();
      // Get data for the last 12 months
      const startDate = subMonths(today, 12).toISOString();
      
      let query = supabase
        .from('bookings')
        .select(`
          price_paid,
          created_at
        `)
        .gte('created_at', startDate)
        .eq('status', 'completed');
      
      if (employeeId !== 'all') {
        query = query.eq('employee_id', employeeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const monthlyMap = new Map<string, number>();
      
      // Process the data by month
      data.forEach((booking) => {
        const date = new Date(booking.created_at);
        const monthYear = format(date, 'MMM yyyy');
        const price = booking.price_paid || 0;
        
        monthlyMap.set(monthYear, (monthlyMap.get(monthYear) || 0) + price);
      });
      
      // Convert to array and sort by date
      const result = Array.from(monthlyMap.entries())
        .map(([month, sales]) => ({ month, sales }))
        .sort((a, b) => {
          const dateA = new Date(a.month);
          const dateB = new Date(b.month);
          return dateA.getTime() - dateB.getTime();
        });
      
      return result;
    }
  });

  const { data: dailySales = [], isLoading: isDailySalesLoading } = useQuery({
    queryKey: ['daily-sales', employeeId, dateRange],
    queryFn: async () => {
      const today = new Date();
      const days = parseInt(dateRange) > 90 ? 90 : parseInt(dateRange); // Limit to 90 days for daily view
      const startDate = subDays(today, days).toISOString();
      
      let query = supabase
        .from('bookings')
        .select(`
          price_paid,
          created_at
        `)
        .gte('created_at', startDate)
        .eq('status', 'completed');
      
      if (employeeId !== 'all') {
        query = query.eq('employee_id', employeeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const dailyMap = new Map<string, number>();
      
      // Process the data by day
      data.forEach((booking) => {
        const date = new Date(booking.created_at);
        const day = format(date, 'dd MMM');
        const price = booking.price_paid || 0;
        
        dailyMap.set(day, (dailyMap.get(day) || 0) + price);
      });
      
      // Convert to array and sort by date
      const result = Array.from(dailyMap.entries())
        .map(([day, sales]) => ({ day, sales }))
        .sort((a, b) => {
          const [dayA] = a.day.split(' ');
          const [dayB] = b.day.split(' ');
          return parseInt(dayA) - parseInt(dayB);
        });
      
      return result;
    }
  });

  const formatCurrency = (value: number) => {
    return `₹${value.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Services by Revenue</CardTitle>
            <CardDescription>Services generating the most revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {isServicesLoading ? (
                <div className="flex items-center justify-center h-full">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serviceTrends} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={70}
                      interval={0}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tickFormatter={formatCurrency}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="sales" fill="#8884d8" name="Sales" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Sales Trend</CardTitle>
            <CardDescription>Performance over the last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {isMonthlySalesLoading ? (
                <div className="flex items-center justify-center h-full">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlySales} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis 
                      tickFormatter={formatCurrency}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#8884d8" 
                      name="Sales"
                      strokeWidth={2} 
                      dot={{ r: 4 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Sales</CardTitle>
          <CardDescription>
            {parseInt(dateRange) > 90 
              ? 'Showing last 90 days (limited for better visualization)' 
              : `Showing last ${dateRange} days`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {isDailySalesLoading ? (
              <div className="flex items-center justify-center h-full">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySales} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 12 }}
                    interval={Math.ceil(dailySales.length / 15)} // Show fewer x-axis labels for better readability
                  />
                  <YAxis 
                    tickFormatter={formatCurrency}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#82ca9d" 
                    name="Sales"
                    strokeWidth={2} 
                    dot={{ r: 3 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
