
import React, { useState } from 'react';
import { ArrowLeft, Calendar, ChevronDown, Download, Filter, Star, Loader } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths } from 'date-fns';

interface FinancialSummaryProps {
  onBack?: () => void;
}

const periods = [
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
];

const monthRanges = [
  { value: '3', label: 'Last 3 months' },
  { value: '6', label: 'Last 6 months' },
  { value: '12', label: 'Last 12 months' },
];

export function FinancialSummary({ onBack }: FinancialSummaryProps) {
  const [period, setPeriod] = useState('month');
  const [monthRange, setMonthRange] = useState('6');
  
  // Generate last X months (based on selected range)
  const generateMonths = () => {
    const months = [];
    const today = new Date();
    const numMonths = parseInt(monthRange);
    
    for (let i = 0; i < numMonths; i++) {
      const date = subMonths(today, i);
      months.push({
        month: format(date, 'MMM yyyy'),
        date: date,
      });
    }
    
    return months.reverse();
  };
  
  const months = generateMonths();
  
  // Optimized data fetching with error handling
  const { data: financialData, isLoading, error } = useQuery({
    queryKey: ['financial-summary', monthRange],
    queryFn: async () => {
      try {
        // Get start date (X months ago)
        const startDate = format(subMonths(new Date(), parseInt(monthRange)), 'yyyy-MM-dd');
        
        console.log('Fetching financial data from:', startDate);
        
        // Fetch appointments for financial calculations
        const { data, error } = await supabase
          .from('appointments')
          .select('*, bookings(*)')
          .gte('created_at', startDate)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log(`Retrieved ${data?.length || 0} appointments`);
        
        // Process data
        const processedData = processFinancialData(data || [], months);
        return processedData;
      } catch (err) {
        console.error('Error fetching financial data:', err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
  
  // Process financial data by month
  const processFinancialData = (appointments: any[], months: any[]) => {
    console.log('Processing financial data...');
    
    // Initialize result structure
    const result = {
      totals: {
        grossSales: 0,
        discounts: 0,
        refunds: 0,
        netSales: 0,
        taxes: 0,
        totalSales: 0,
        giftCardSales: 0,
        serviceCharges: 0,
        tips: 0
      },
      monthly: {} as Record<string, {
        grossSales: number,
        discounts: number,
        refunds: number,
        netSales: number,
        taxes: number,
        totalSales: number,
        giftCardSales: number,
        serviceCharges: number,
        tips: number
      }>
    };
    
    // Initialize monthly data
    months.forEach(month => {
      result.monthly[month.month] = {
        grossSales: 0,
        discounts: 0,
        refunds: 0,
        netSales: 0,
        taxes: 0,
        totalSales: 0,
        giftCardSales: 0,
        serviceCharges: 0,
        tips: 0
      };
    });
    
    // Process appointments
    appointments.forEach(appointment => {
      const appointmentDate = new Date(appointment.created_at);
      const monthKey = format(appointmentDate, 'MMM yyyy');
      
      // Skip if month not in our range
      if (!result.monthly[monthKey]) return;
      
      // Calculate values
      const grossSale = Number(appointment.original_total_price || appointment.total_price || 0);
      const discountValue = Number(appointment.discount_value || 0);
      const refundValue = appointment.transaction_type === 'refund' ? Number(appointment.total_price || 0) : 0;
      const netSale = grossSale - discountValue - refundValue;
      
      // Calculate tips from bookings
      let tips = 0;
      if (appointment.bookings && appointment.bookings.length > 0) {
        appointment.bookings.forEach((booking: any) => {
          const originalPrice = Number(booking.original_price || 0);
          const pricePaid = Number(booking.price_paid || 0);
          if (pricePaid > originalPrice) {
            tips += pricePaid - originalPrice;
          }
        });
      }
      
      // Update monthly data
      result.monthly[monthKey].grossSales += grossSale;
      result.monthly[monthKey].discounts += discountValue;
      result.monthly[monthKey].refunds += refundValue;
      result.monthly[monthKey].netSales += netSale;
      result.monthly[monthKey].totalSales += netSale;
      result.monthly[monthKey].tips += tips;
      
      // Update totals
      result.totals.grossSales += grossSale;
      result.totals.discounts += discountValue;
      result.totals.refunds += refundValue;
      result.totals.netSales += netSale;
      result.totals.totalSales += netSale;
      result.totals.tips += tips;
    });
    
    console.log('Financial data processing complete');
    return result;
  };
  
  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  // Handle error display
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onBack && (
              <Button variant="ghost" onClick={onBack} className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Button>
            )}
            <div>
              <h2 className="text-2xl font-bold">Finance summary</h2>
              <p className="text-sm text-muted-foreground">
                High-level summary of sales, payments and liabilities
              </p>
            </div>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="text-red-500 mb-4">
                Error loading financial data
              </div>
              <p className="text-muted-foreground mb-4">
                {(error as Error).message || 'An unexpected error occurred'}
              </p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <Button variant="ghost" onClick={onBack} className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-bold">Finance summary</h2>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Star className="h-4 w-4" />
                <span className="sr-only">Favorite</span>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              High-level summary of sales, payments and liabilities
            </p>
          </div>
        </div>
        <div>
          <Button variant="outline">
            Options <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex items-center border rounded-md">
                <Select value={monthRange} onValueChange={setMonthRange}>
                  <SelectTrigger className="border-none">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthRanges.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="px-3 py-2 border-l">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              
              <Button variant="outline" className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Data from {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          
          <div className="overflow-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-8">
                <Loader className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading financial data...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Sales</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    {months.map(month => (
                      <TableHead key={month.month} className="text-right">{month.month}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Gross sales</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(financialData?.totals.grossSales || 0)}
                    </TableCell>
                    {months.map(month => (
                      <TableCell key={month.month} className="text-right">
                        {formatCurrency(financialData?.monthly[month.month]?.grossSales || 0)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-indigo-600 pl-8">Discounts</TableCell>
                    <TableCell className="text-right text-indigo-600">
                      {formatCurrency(-(financialData?.totals.discounts || 0))}
                    </TableCell>
                    {months.map(month => (
                      <TableCell key={month.month} className="text-right text-indigo-600">
                        {formatCurrency(-(financialData?.monthly[month.month]?.discounts || 0))}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-indigo-600 pl-8">Refunds / Returns</TableCell>
                    <TableCell className="text-right text-indigo-600">
                      {formatCurrency(-(financialData?.totals.refunds || 0))}
                    </TableCell>
                    {months.map(month => (
                      <TableCell key={month.month} className="text-right text-indigo-600">
                        {formatCurrency(-(financialData?.monthly[month.month]?.refunds || 0))}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Net sales</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(financialData?.totals.netSales || 0)}
                    </TableCell>
                    {months.map(month => (
                      <TableCell key={month.month} className="text-right font-medium">
                        {formatCurrency(financialData?.monthly[month.month]?.netSales || 0)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-indigo-600 pl-8">Taxes</TableCell>
                    <TableCell className="text-right text-indigo-600">
                      {formatCurrency(financialData?.totals.taxes || 0)}
                    </TableCell>
                    {months.map(month => (
                      <TableCell key={month.month} className="text-right text-indigo-600">
                        {formatCurrency(financialData?.monthly[month.month]?.taxes || 0)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Total sales</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(financialData?.totals.totalSales || 0)}
                    </TableCell>
                    {months.map(month => (
                      <TableCell key={month.month} className="text-right font-medium">
                        {formatCurrency(financialData?.monthly[month.month]?.totalSales || 0)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-indigo-600 pl-8">Gift card sales</TableCell>
                    <TableCell className="text-right text-indigo-600">
                      {formatCurrency(financialData?.totals.giftCardSales || 0)}
                    </TableCell>
                    {months.map(month => (
                      <TableCell key={month.month} className="text-right text-indigo-600">
                        {formatCurrency(financialData?.monthly[month.month]?.giftCardSales || 0)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-indigo-600 pl-8">Service charges</TableCell>
                    <TableCell className="text-right text-indigo-600">
                      {formatCurrency(financialData?.totals.serviceCharges || 0)}
                    </TableCell>
                    {months.map(month => (
                      <TableCell key={month.month} className="text-right text-indigo-600">
                        {formatCurrency(financialData?.monthly[month.month]?.serviceCharges || 0)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-indigo-600 pl-8">Tips</TableCell>
                    <TableCell className="text-right text-indigo-600">
                      {formatCurrency(financialData?.totals.tips || 0)}
                    </TableCell>
                    {months.map(month => (
                      <TableCell key={month.month} className="text-right text-indigo-600">
                        {formatCurrency(financialData?.monthly[month.month]?.tips || 0)}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button variant="outline" className="flex items-center">
              <Download className="mr-2 h-4 w-4" />
              Download report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
