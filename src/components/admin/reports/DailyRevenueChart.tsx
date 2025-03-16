
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface DailyRevenueChartProps {
  selectedDate: Date;
  locationId?: string;
}

export function DailyRevenueChart({ selectedDate, locationId }: DailyRevenueChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['daily-revenue-chart', format(selectedDate, 'yyyy-MM-dd'), locationId],
    queryFn: async () => {
      // Get data for the past 7 days
      const chartData = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = subDays(selectedDate, i);
        const start = startOfDay(date).toISOString();
        const end = endOfDay(date).toISOString();
        
        let query = supabase
          .from('appointments')
          .select(`
            id,
            total_price,
            payment_method,
            status,
            bookings(id)
          `)
          .gte('start_time', start)
          .lte('start_time', end);
        
        if (locationId && locationId !== "all") {
          query = query.eq('location', locationId);
        }
        
        const { data: dailyData, error } = await query;
        
        if (error) {
          console.error('Error fetching chart data:', error);
          throw error;
        }
        
        const completedAppointments = dailyData.filter(a => a.status === 'completed' || a.status === 'paid');
        const totalRevenue = completedAppointments.reduce((sum, a) => sum + (a.total_price || 0), 0);
        const bookingCount = dailyData.reduce((sum, a) => sum + (a.bookings?.length || 0), 0);
        
        chartData.push({
          date: format(date, 'MMM dd'),
          revenue: totalRevenue,
          bookings: bookingCount
        });
      }
      
      return chartData;
    }
  });
  
  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Trend (Last 7 Days)</CardTitle>
        <CardDescription>Revenue and booking counts for the week</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" orientation="left" tickFormatter={(value) => `₹${value}`} />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'revenue' ? `₹${value}` : value,
                  name === 'revenue' ? 'Revenue' : 'Bookings'
                ]}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="bookings" name="Bookings" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
