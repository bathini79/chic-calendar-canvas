
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

export default function RevenueChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['revenue-trend'],
    queryFn: async () => {
      // Fetch last 7 days of revenue data
      const endDate = new Date();
      const startDate = subDays(endDate, 6); // 7 days including today
      
      // Format dates for display
      const dateRange = [];
      for (let i = 0; i <= 6; i++) {
        const date = subDays(endDate, 6 - i);
        dateRange.push({
          date: format(date, 'yyyy-MM-dd'),
          displayDate: format(date, 'MMM dd'),
        });
      }
      
      // Get revenue for each day
      const revenueByDay = await Promise.all(
        dateRange.map(async ({ date, displayDate }) => {
          const start = startOfDay(new Date(date));
          const end = endOfDay(new Date(date));
          
          const { data: appointments, error } = await supabase
            .from('appointments')
            .select('total_price')
            .gte('start_time', start.toISOString())
            .lte('start_time', end.toISOString())
            .eq('status', 'completed');
          
          if (error) throw error;
          
          const dayRevenue = appointments?.reduce((sum, app) => sum + (app.total_price || 0), 0) || 0;
          
          return {
            name: displayDate,
            revenue: dayRevenue
          };
        })
      );
      
      return revenueByDay;
    }
  });

  if (isLoading) {
    return <Skeleton className="h-full w-full" />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{
          top: 5,
          right: 10,
          left: 10,
          bottom: 0,
        }}
      >
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis 
          dataKey="name" 
          stroke="#888888" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
        />
        <YAxis 
          stroke="#888888" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
          tickFormatter={(value) => `₹${value}`}
        />
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <Tooltip 
          formatter={(value) => [`₹${value}`, 'Revenue']}
          contentStyle={{ 
            background: 'white', 
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            fontSize: '12px'
          }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#0ea5e9"
          fillOpacity={1}
          fill="url(#colorRevenue)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
