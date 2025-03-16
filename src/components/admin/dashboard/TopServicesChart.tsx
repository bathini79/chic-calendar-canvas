
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

export default function TopServicesChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['top-services'],
    queryFn: async () => {
      // Get services with their bookings
      const { data: services, error } = await supabase
        .from('services')
        .select(`
          id,
          name,
          selling_price,
          bookings(
            id,
            price_paid
          )
        `)
        .eq('status', 'active');
      
      if (error) throw error;

      // Calculate total revenue per service and sort by revenue
      const servicesWithRevenue = services
        .map(service => {
          const totalRevenue = service.bookings?.reduce((sum, booking) => sum + (booking.price_paid || 0), 0) || 0;
          return {
            id: service.id,
            name: service.name,
            revenue: totalRevenue,
            bookings: service.bookings?.length || 0
          };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5); // Get top 5
      
      return servicesWithRevenue;
    }
  });

  if (isLoading) {
    return <Skeleton className="h-full w-full" />;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 60,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis 
          dataKey="name" 
          angle={-45} 
          textAnchor="end" 
          height={60} 
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          tickFormatter={(value) => `₹${value}`}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={60}
        />
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
        <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
