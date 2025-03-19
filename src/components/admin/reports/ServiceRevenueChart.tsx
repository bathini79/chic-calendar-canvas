
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay } from 'date-fns';

interface ServiceRevenueChartProps {
  selectedDate: Date;
  locationId?: string;
}

const ServiceRevenueChart: React.FC<ServiceRevenueChartProps> = ({ 
  selectedDate,
  locationId
}) => {
  // Query to fetch service revenue data
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ['service-revenue', format(selectedDate, 'yyyy-MM-dd'), locationId],
    queryFn: async () => {
      const startDate = startOfDay(selectedDate).toISOString();
      const endDate = endOfDay(selectedDate).toISOString();
      
      // Build the query
      let query = supabase
        .from('bookings')
        .select(`
          service_id,
          services (name),
          price_paid
        `)
        .is('package_id', null)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .eq('status', 'completed');
      
      // Add location filter if provided
      if (locationId) {
        const appointmentIds = await supabase
          .from('appointments')
          .select('id')
          .eq('location', locationId)
          .gte('created_at', startDate)
          .lte('created_at', endDate);
        
        if (appointmentIds.data && appointmentIds.data.length > 0) {
          const ids = appointmentIds.data.map(a => a.id);
          query = query.in('appointment_id', ids);
        }
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Group by service and calculate total revenue
      const serviceRevenue = data.reduce((acc, booking) => {
        const serviceName = booking.services?.name || 'Unknown';
        if (!acc[serviceName]) {
          acc[serviceName] = 0;
        }
        acc[serviceName] += booking.price_paid || 0;
        return acc;
      }, {});
      
      // Convert to chart data format
      return Object.entries(serviceRevenue).map(([name, revenue]) => ({
        name,
        revenue
      })).sort((a, b) => (b.revenue as number) - (a.revenue as number)).slice(0, 10);
    }
  });

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Service Revenue</CardTitle>
        <CardDescription>
          Top services by revenue on {format(selectedDate, 'MMMM d, yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-80">
            <p>Loading revenue data...</p>
          </div>
        ) : revenueData && revenueData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={revenueData}>
              <XAxis 
                dataKey="name" 
                tickLine={false} 
                axisLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  // Truncate long service names
                  return value.length > 15 ? `${value.substring(0, 15)}...` : value;
                }}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip 
                formatter={(value) => [`₹${value}`, 'Revenue']}
                labelFormatter={(label) => `Service: ${label}`}
              />
              <Legend />
              <Bar dataKey="revenue" name="Revenue (₹)" fill="#8884d8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-80">
            <p>No revenue data available for this date</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceRevenueChart;
