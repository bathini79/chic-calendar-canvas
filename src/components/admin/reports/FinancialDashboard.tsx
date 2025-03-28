
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DailyRevenue } from './DailyRevenue';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function FinancialDashboard() {
  const [period, setPeriod] = useState<string>('6');
  
  // Get data for financial summary
  const { data: overviewData, isLoading: loadingOverview } = useQuery({
    queryKey: ['financial-overview', period],
    queryFn: async () => {
      // Get start date (X months ago)
      const startDate = format(subMonths(new Date(), parseInt(period)), 'yyyy-MM-dd');
      
      // Fetch appointments for financial calculations
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Calculate financial metrics
      const grossSales = appointments?.reduce((sum, appointment) => 
        sum + (appointment.original_total_price || appointment.total_price || 0), 0);
      
      const discounts = appointments?.reduce((sum, appointment) => 
        sum + (appointment.discount_value || 0), 0);
      
      const refunds = appointments?.filter(a => a.transaction_type === 'refund')
        .reduce((sum, appointment) => sum + (appointment.total_price || 0), 0);
      
      const netSales = grossSales - discounts - refunds;
      
      return {
        grossSales,
        discounts,
        refunds,
        netSales,
        taxCollected: appointments?.reduce((sum, appointment) => sum + (appointment.tax_amount || 0), 0),
        totalSales: netSales, // Can be adjusted if there are other components to add
      };
    }
  });
  
  // Get revenue by month data
  const { data: monthlyRevenue, isLoading: loadingMonthly } = useQuery({
    queryKey: ['monthly-revenue', period],
    queryFn: async () => {
      const months = [];
      const today = new Date();
      const numMonths = parseInt(period);
      
      for (let i = numMonths - 1; i >= 0; i--) {
        const date = subMonths(today, i);
        const startOfMonthDate = startOfMonth(date);
        const endOfMonthDate = endOfMonth(date);
        
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select('*')
          .gte('created_at', startOfMonthDate.toISOString())
          .lte('created_at', endOfMonthDate.toISOString());
        
        if (error) throw error;
        
        const totalRevenue = appointments?.reduce(
          (sum, appointment) => sum + (appointment.total_price || 0), 
          0
        );
        
        months.push({
          name: format(date, 'MMM yy'),
          revenue: totalRevenue || 0
        });
      }
      
      return months;
    }
  });
  
  // Get payment methods distribution
  const { data: paymentMethods, isLoading: loadingPaymentMethods } = useQuery({
    queryKey: ['payment-methods', period],
    queryFn: async () => {
      const startDate = format(subMonths(new Date(), parseInt(period)), 'yyyy-MM-dd');
      
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('payment_method, total_price')
        .gte('created_at', startDate);
      
      if (error) throw error;
      
      // Group by payment method
      const paymentMethodGroups: Record<string, number> = {};
      
      appointments?.forEach(appointment => {
        const method = appointment.payment_method || 'unknown';
        if (!paymentMethodGroups[method]) {
          paymentMethodGroups[method] = 0;
        }
        paymentMethodGroups[method] += (appointment.total_price || 0);
      });
      
      // Convert to array for pie chart
      return Object.keys(paymentMethodGroups).map(method => ({
        name: method.charAt(0).toUpperCase() + method.slice(1),
        value: paymentMethodGroups[method]
      }));
    }
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name');
      
      if (error) throw error;
      return data || [];
    }
  });
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Financial Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your business's financial performance
        </p>
      </div>
      
      <div className="flex items-center justify-between">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" /> Filters
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loadingOverview ? (
          Array(6).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-[200px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-[150px]" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Gross Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{overviewData?.grossSales.toFixed(2) || '0.00'}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Discounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{overviewData?.discounts.toFixed(2) || '0.00'}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Refunds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{overviewData?.refunds.toFixed(2) || '0.00'}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Net Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{overviewData?.netSales.toFixed(2) || '0.00'}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tax Collected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{overviewData?.taxCollected.toFixed(2) || '0.00'}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{overviewData?.totalSales.toFixed(2) || '0.00'}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
            <CardDescription>Revenue trend over the past {period} months</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingMonthly ? (
              <div className="h-full w-full flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyRevenue}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis 
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip 
                    formatter={(value) => [`₹${value}`, 'Revenue']}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Revenue distribution by payment type</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingPaymentMethods ? (
              <div className="h-full w-full flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethods}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {paymentMethods?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`₹${value}`, 'Amount']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <DailyRevenue expanded locations={locations} />

      <div className="flex justify-end">
        <Button variant="outline" className="flex items-center">
          <Download className="mr-2 h-4 w-4" />
          Download report
        </Button>
      </div>
    </div>
  );
}
