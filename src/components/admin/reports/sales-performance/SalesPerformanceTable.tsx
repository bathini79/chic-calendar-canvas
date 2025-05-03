
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell, 
  TableFooter 
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';

interface SalesPerformanceTableProps {
  employeeId: string;
  dateRange: string;
}

export function SalesPerformanceTable({ employeeId, dateRange }: SalesPerformanceTableProps) {
  // Parse the date range and calculate the start and end dates
  const getDateRange = () => {
    const today = new Date();
    
    if (dateRange === 'custom') {
      // For custom range, we'd typically have date pickers
      // For now, default to last 30 days
      return {
        startDate: subDays(today, 30),
        endDate: today
      };
    }
    
    const days = parseInt(dateRange, 10);
    return {
      startDate: subDays(today, days),
      endDate: today
    };
  };
  
  const { startDate, endDate } = getDateRange();
  
  // Fetch the sales performance data
  const { data, isLoading } = useQuery({
    queryKey: ['sales-performance', employeeId, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('bookings')
        .select(`
          service_id,
          price_paid,
          status,
          services:service_id (
            name,
            selling_price,
            original_price
          ),
          employee_id,
          employees:employee_id (
            name
          ),
          appointment_id,
          appointments:appointment_id (
            created_at,
            discount_value,
            discount_type
          )
        `)
        .gte('appointments.created_at', startOfDay(startDate).toISOString())
        .lte('appointments.created_at', endOfDay(endDate).toISOString())
        .eq('status', 'completed');
      
      // If an employee is selected, filter by that employee
      if (employeeId !== 'all') {
        query = query.eq('employee_id', employeeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Process the data to get the required metrics per service
      const serviceMap = new Map();
      
      data.forEach(booking => {
        if (!booking.service_id || !booking.services) return;
        
        const service = booking.services;
        const serviceId = booking.service_id;
        
        if (!serviceMap.has(serviceId)) {
          serviceMap.set(serviceId, {
            name: service.name,
            count: 0,
            grossSales: 0,
            discount: 0,
            netSales: 0
          });
        }
        
        const serviceData = serviceMap.get(serviceId);
        serviceData.count += 1;
        
        // Calculate the original price (gross)
        const originalPrice = service.original_price || service.selling_price;
        serviceData.grossSales += originalPrice;
        
        // Calculate the discount per service
        // This is a simplification - in a real app we'd calculate the exact discount attribution
        // We're assuming the discount is applied proportionally to all services
        if (booking.appointments && booking.appointments.discount_value) {
          const discount = booking.appointments.discount_value / (data.filter(b => b.appointment_id === booking.appointment_id).length);
          serviceData.discount += discount;
        }
        
        // Calculate the net sales
        serviceData.netSales += booking.price_paid;
      });
      
      return Array.from(serviceMap.values());
    }
  });
  
  // Calculate the totals
  const calculateTotals = () => {
    if (!data || data.length === 0) return null;
    
    return data.reduce((totals, service) => ({
      count: totals.count + service.count,
      grossSales: totals.grossSales + service.grossSales,
      discount: totals.discount + service.discount,
      netSales: totals.netSales + service.netSales
    }), { count: 0, grossSales: 0, discount: 0, netSales: 0 });
  };
  
  const totals = calculateTotals();
  
  // Format the currency values
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Export functions
  const exportData = (format: 'pdf' | 'csv' | 'excel') => {
    // In a real app, we would implement actual export functionality here
    toast.success(`Exporting data as ${format.toUpperCase()}...`);
    
    // For CSV and Excel, we could use libraries like csv-stringify or xlsx
    // For PDF, we could use libraries like jspdf or react-pdf
  };
  
  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-4 flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center">
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => exportData('pdf')}>
                <FileText className="h-4 w-4 mr-2" /> Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData('csv')}>
                <FileText className="h-4 w-4 mr-2" /> Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData('excel')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Name</TableHead>
                <TableHead className="text-right">Services Count</TableHead>
                <TableHead className="text-right">Gross Sales</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Net Sales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 5 }).map((_, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data && data.length > 0 ? (
                data.map((service, index) => (
                  <TableRow key={index}>
                    <TableCell>{service.name}</TableCell>
                    <TableCell className="text-right">{service.count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(service.grossSales)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(service.discount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(service.netSales)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    No sales data available for the selected criteria
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {totals && (
              <TableFooter>
                <TableRow>
                  <TableCell className="font-medium">Total</TableCell>
                  <TableCell className="text-right">{totals.count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.grossSales)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.discount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.netSales)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
