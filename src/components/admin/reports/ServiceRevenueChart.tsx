
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ServiceRevenueChartProps {
  selectedDate: Date;
  locationId?: string;
}

export function ServiceRevenueChart({ selectedDate, locationId }: ServiceRevenueChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['service-revenue', format(selectedDate, 'yyyy-MM-dd'), locationId],
    queryFn: async () => {
      const start = startOfDay(selectedDate).toISOString();
      const end = endOfDay(selectedDate).toISOString();

      // Get all appointments for the selected date
      let query = supabase
        .from('appointments')
        .select(`
          id,
          bookings(
            id,
            price_paid,
            service_id,
            service:services(
              id,
              name
            )
          )
        `)
        .gte('start_time', start)
        .lte('start_time', end)
        .eq('status', 'completed');

      if (locationId && locationId !== "all") {
        query = query.eq('location', locationId);
      }

      const { data: appointments, error } = await query;

      if (error) {
        console.error('Error fetching service revenue:', error);
        throw error;
      }

      // Aggregate revenue by service
      const serviceRevenue = {};
      
      appointments.forEach(appointment => {
        appointment.bookings?.forEach(booking => {
          if (booking.service_id && booking.service) {
            const serviceName = booking.service.name;
            if (!serviceRevenue[serviceName]) {
              serviceRevenue[serviceName] = 0;
            }
            serviceRevenue[serviceName] += booking.price_paid || 0;
          }
        });
      });

      // Convert to array for chart
      const chartData = Object.entries(serviceRevenue)
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10); // Get top 10 services

      return chartData;
    }
  });

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Services by Revenue</CardTitle>
        <CardDescription>Revenue breakdown by service for {format(selectedDate, 'MMMM d, yyyy')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              layout="vertical" 
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" tickFormatter={(value) => `₹${value}`} />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                width={100}
              />
              <Tooltip 
                formatter={(value) => [`₹${value}`, 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#8884d8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
