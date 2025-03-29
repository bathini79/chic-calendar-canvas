
import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { useQuery } from '@tanstack/react-query';

type SalesPerformanceTableProps = {
  employeeId: string;
  dateRange: string;
};

type ServiceSalesData = {
  name: string;
  count: number;
  grossSales: number;
  discount: number;
  netSales: number;
  totalSales: number;
};

export const SalesPerformanceTable = ({ employeeId, dateRange }: SalesPerformanceTableProps) => {
  const { data: salesData = [], isLoading } = useQuery({
    queryKey: ['service-sales', employeeId, dateRange],
    queryFn: async () => {
      const today = new Date();
      const days = parseInt(dateRange);
      const startDate = subDays(today, days).toISOString();
      
      let query = supabase
        .from('bookings')
        .select(`
          service_id,
          price_paid,
          services(name),
          appointment_id,
          appointments(discount_value, discount_type)
        `)
        .gte('created_at', startDate)
        .eq('status', 'completed');
      
      if (employeeId !== 'all') {
        query = query.eq('employee_id', employeeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const serviceMap = new Map<string, ServiceSalesData>();
      
      // Process the data
      data.forEach((booking) => {
        if (!booking.service_id || !booking.services) return;
        
        const serviceName = booking.services.name;
        const price = booking.price_paid || 0;
        const discount = booking.appointments?.discount_value || 0;
        
        if (!serviceMap.has(serviceName)) {
          serviceMap.set(serviceName, {
            name: serviceName,
            count: 0,
            grossSales: 0,
            discount: 0,
            netSales: 0,
            totalSales: 0
          });
        }
        
        const current = serviceMap.get(serviceName)!;
        current.count += 1;
        current.grossSales += price;
        current.discount += discount;
        current.netSales += (price - discount);
        current.totalSales += price;
        
        serviceMap.set(serviceName, current);
      });
      
      // Calculate totals
      let totalCount = 0;
      let totalGrossSales = 0;
      let totalDiscount = 0;
      let totalNetSales = 0;
      let totalTotalSales = 0;
      
      const servicesData = Array.from(serviceMap.values());
      
      servicesData.forEach(service => {
        totalCount += service.count;
        totalGrossSales += service.grossSales;
        totalDiscount += service.discount;
        totalNetSales += service.netSales;
        totalTotalSales += service.totalSales;
      });
      
      // Add the total row at the beginning
      const resultWithTotal = [
        {
          name: 'Total',
          count: totalCount,
          grossSales: totalGrossSales,
          discount: totalDiscount,
          netSales: totalNetSales,
          totalSales: totalTotalSales
        },
        ...servicesData.sort((a, b) => b.grossSales - a.grossSales)
      ];
      
      return resultWithTotal;
    }
  });

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  if (isLoading) {
    return <div className="py-10 text-center">Loading sales data...</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Name</TableHead>
            <TableHead>Services Count</TableHead>
            <TableHead>Gross Sales</TableHead>
            <TableHead>Discount</TableHead>
            <TableHead>Net Sales</TableHead>
            <TableHead>Total Sales</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {salesData.map((service, index) => (
            <TableRow key={index} className={index === 0 ? "font-medium" : ""}>
              <TableCell className="font-medium">{service.name}</TableCell>
              <TableCell>{service.count}</TableCell>
              <TableCell>{formatCurrency(service.grossSales)}</TableCell>
              <TableCell>{formatCurrency(service.discount)}</TableCell>
              <TableCell>{formatCurrency(service.netSales)}</TableCell>
              <TableCell>{formatCurrency(service.totalSales)}</TableCell>
            </TableRow>
          ))}
          {salesData.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-6">
                No sales data available for the selected filters
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
