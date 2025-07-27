import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ReportDataTable, ReportColumn } from '../components/ReportDataTable';
import { useExportContext } from '../layout/ReportsLayout';
import { Filter, CreditCard, Banknote, Smartphone, Wallet, MapPin } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePaymentMethods } from '@/hooks/use-payment-methods';

interface PaymentMethodData {
  id: string;
  payment_method: string;
  date: string;
  location: string;
  total_amount: number;
  transaction_count: number;
  average_amount: number;
}

interface PaymentMethodSummary {
  id: string;
  payment_method: string;
  total_amount: number;
  transaction_count: number;
  average_amount: number;
  percentage: number;
}

export function PaymentMethodsReport() {
  const isMobile = useIsMobile();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ 
    from: subDays(new Date(), 30), 
    to: new Date() 
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({
    location: 'all'
  });

  // Export context for sharing data with layout
  const { setExportData, setReportName } = useExportContext();

  // Fetch locations for filter dropdown
  const { data: locations = [] } = useQuery({
    queryKey: ['locations-for-payment-methods-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .order('name');
      
      if (error) {
        console.error('Error fetching locations:', error);
        return [];
      }
      return data || [];
    }
  });

  // Fetch payment methods configuration
  const { paymentMethods = [] } = usePaymentMethods();

  // Fetch payment data from appointments
  const { data: appointmentData, isLoading: appointmentLoading } = useQuery({
    queryKey: ['payment-methods-appointments', dateRange, filters],
    queryFn: async () => {
      const startDate = dateRange?.from || subDays(new Date(), 30);
      const endDate = dateRange?.to || new Date();

      let query = supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          payment_method,
          location,
          status,
          total_price,
          bookings(
            price_paid,
            original_price
          )
        `)
        .gte('start_time', startOfDay(startDate).toISOString())
        .lte('start_time', endOfDay(endDate).toISOString())
        .in('status', ['completed']);

      // Apply location filter
      if (filters.location && filters.location !== 'all') {
        query = query.eq('location', filters.location);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching appointment data:', error);
        return [];
      }
      
      return (data || []).map((appointment) => ({
        id: appointment.id,
        payment_method: appointment.payment_method || 'Unknown',
        date: format(new Date(appointment.start_time), 'yyyy-MM-dd'),
        location: appointment.location || 'Unknown',
        total_amount: appointment.total_price || 0,
        bookings_count: appointment.bookings?.length || 0
      }));
    }
  });

  // Calculate payment method summaries
  const paymentMethodSummaries = useMemo(() => {
    if (!appointmentData || appointmentData.length === 0) return [];

    const summaryMap = new Map<string, {
      total_amount: number;
      transaction_count: number;
    }>();

    appointmentData.forEach((item) => {
      const method = item.payment_method;
      const existing = summaryMap.get(method) || { total_amount: 0, transaction_count: 0 };
      
      summaryMap.set(method, {
        total_amount: existing.total_amount + item.total_amount,
        transaction_count: existing.transaction_count + 1
      });
    });

    const totalAmount = Array.from(summaryMap.values()).reduce((sum, item) => sum + item.total_amount, 0);

    return Array.from(summaryMap.entries()).map(([method, data]) => ({
      id: method,
      payment_method: method,
      total_amount: data.total_amount,
      transaction_count: data.transaction_count,
      average_amount: data.transaction_count > 0 ? data.total_amount / data.transaction_count : 0,
      percentage: totalAmount > 0 ? (data.total_amount / totalAmount) * 100 : 0
    })).sort((a, b) => b.total_amount - a.total_amount);
  }, [appointmentData]);

  // Calculate day-wise data
  const dayWiseData = useMemo(() => {
    if (!appointmentData || appointmentData.length === 0) return [];

    const dayWiseMap = new Map<string, Map<string, number>>();

    appointmentData.forEach((item) => {
      const date = item.date;
      const method = item.payment_method;
      
      if (!dayWiseMap.has(date)) {
        dayWiseMap.set(date, new Map<string, number>());
      }
      
      const dayMap = dayWiseMap.get(date)!;
      dayMap.set(method, (dayMap.get(method) || 0) + item.total_amount);
    });

    const result: PaymentMethodData[] = [];
    let idCounter = 1;

    dayWiseMap.forEach((methodMap, date) => {
      methodMap.forEach((amount, method) => {
        const transactionCount = appointmentData.filter(
          item => item.date === date && item.payment_method === method
        ).length;

        result.push({ 
          id: `${date}-${method}-${idCounter++}`,
          payment_method: method,
          date,
          location: 'Multiple', // Could be refined to show specific locations
          total_amount: amount,
          transaction_count: transactionCount,
          average_amount: transactionCount > 0 ? amount / transactionCount : 0
        });
      });
    });

    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appointmentData]);

  // Payment method icon mapping
  const getPaymentMethodIcon = (method: string) => {
    const methodLower = method.toLowerCase();
    if (methodLower.includes('cash')) return Banknote;
    if (methodLower.includes('card') || methodLower.includes('credit') || methodLower.includes('debit')) return CreditCard;
    if (methodLower.includes('online') || methodLower.includes('upi') || methodLower.includes('digital')) return Smartphone;
    return Wallet;
  };

  // Filter handlers
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleFilterReset = () => {
    setFilters({
      location: 'all'
    });
  };

  const activeFiltersCount = Object.values(filters).filter(value => value && value !== 'all').length;

  // Set up export data
  useEffect(() => {
    setExportData(paymentMethodSummaries);
    setReportName('payment-methods-report');
  }, [paymentMethodSummaries, setExportData, setReportName]);

  // Table columns for summary
  const summaryColumns: ReportColumn[] = [
    { key: 'payment_method', label: 'Payment Method', sortable: true, type: 'text' },
    { key: 'total_amount', label: 'Total Amount', sortable: true, type: 'currency' },
    { key: 'transaction_count', label: 'Transactions', sortable: true, type: 'number' },
    { key: 'average_amount', label: 'Average Amount', sortable: true, type: 'currency' },
    { key: 'percentage', label: 'Percentage', sortable: true, type: 'percentage' }
  ];

  // Table columns for day-wise data
  const dayWiseColumns: ReportColumn[] = [
    { key: 'date', label: 'Date', sortable: true, type: 'date' },
    { key: 'payment_method', label: 'Payment Method', sortable: true, type: 'text' },
    { key: 'total_amount', label: 'Amount', sortable: true, type: 'currency' },
    { key: 'transaction_count', label: 'Transactions', sortable: true, type: 'number' },
    { key: 'average_amount', label: 'Average', sortable: true, type: 'currency' }
  ];

  const isLoading = appointmentLoading;
  const totalAmount = paymentMethodSummaries.reduce((sum, item) => sum + item.total_amount, 0);
  const totalTransactions = paymentMethodSummaries.reduce((sum, item) => sum + item.transaction_count, 0);

  return (
    <div className="space-y-6">
      {/* Layout matching other reports */}
      <div className="space-y-4 sm:space-y-0">
        {/* Calendar and Filter aligned to the left */}
        <div className="flex items-center justify-start gap-3">
          {/* Calendar first */}
          <DateRangePicker
            dateRange={dateRange}
            onChange={setDateRange}
            isMobile={isMobile}
            align="center"
            useDialogOnDesktop={true}
            dialogWidth="w-[600px] max-w-[90vw]"
            popoverWidth="w-[740px]"
            compact={false}
          />
          
          {/* Filter button second - icon only on mobile, with text on desktop */}
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={() => setFiltersOpen(true)}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="default" className="ml-1 px-1.5 py-0.5 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {paymentMethodSummaries.slice(0, 4).map((summary) => {
          const IconComponent = getPaymentMethodIcon(summary.payment_method);
          return (
            <Card key={summary.payment_method} className="overflow-hidden">
              <CardContent className="p-5 flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <IconComponent className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{summary.payment_method}</h3>
                  </div>
                </div>                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    ₹{summary.total_amount.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {summary.transaction_count} transactions • {summary.percentage.toFixed(1)}%
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Overall Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Total Revenue</CardTitle>          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Average Transaction</CardTitle>          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{totalTransactions > 0 ? (totalAmount / totalTransactions).toFixed(2) : '0.00'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportDataTable
            data={paymentMethodSummaries}
            columns={summaryColumns}
            title=""
            searchPlaceholder=""
            loading={isLoading}
            externalSearchTerm=""
            totalCount={paymentMethodSummaries.length}
          />
        </CardContent>
      </Card>

      {/* Day-wise Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Day-wise Payment Methods Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportDataTable
            data={dayWiseData}
            columns={dayWiseColumns}
            title=""
            searchPlaceholder=""
            loading={isLoading}
            externalSearchTerm=""
            totalCount={dayWiseData.length}
          />
        </CardContent>
      </Card>

      {/* Filter Dialog */}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg">Filter Payment Methods Data</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Apply filters to refine your payment methods analysis
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-3 py-2 max-h-[50vh]">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Location</label>
              <Select
                value={filters.location}
                onValueChange={(value) => handleFilterChange('location', value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {location.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2 border-t mt-2">
            <Button
              variant="outline"
              onClick={handleFilterReset}
              className="flex-1 h-9"
            >
              Reset
            </Button>
            <Button onClick={() => setFiltersOpen(false)} className="flex-1 h-9">
              Apply Filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
