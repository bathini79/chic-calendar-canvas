import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Calendar, FileSpreadsheet, FileText, BarChart4 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRange } from "react-day-picker";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isValid } from 'date-fns';
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { toast } from 'sonner';

interface PaymentBySourceProps {
  onBack: () => void;
}

type DateRangeType = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';

// Payment methods supported in the system
const PAYMENT_METHODS = ['cash', 'card', 'online', 'upi', 'wallet', 'payLater', 'other'];

// Colors for the pie chart
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658'];

export function PaymentBySource({ onBack }: PaymentBySourceProps) {
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('today');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date()
  });
  const [showChart, setShowChart] = useState(false);
  
  // Update date range based on the selected range type
  useEffect(() => {
    const today = new Date();
    
    switch (dateRangeType) {
      case 'today':
        setDateRange({ from: today, to: today });
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        setDateRange({ from: yesterday, to: yesterday });
        break;
      case 'thisWeek':
        setDateRange({ 
          from: startOfWeek(today, { weekStartsOn: 1 }), 
          to: endOfWeek(today, { weekStartsOn: 1 }) 
        });
        break;
      case 'lastWeek':
        const lastWeekStart = startOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        const lastWeekEnd = endOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        setDateRange({ from: lastWeekStart, to: lastWeekEnd });
        break;
      case 'thisMonth':
        setDateRange({ 
          from: startOfMonth(today), 
          to: endOfMonth(today) 
        });
        break;
      case 'lastMonth':
        const lastMonthStart = startOfMonth(subDays(today, 30));
        const lastMonthEnd = endOfMonth(subDays(today, 30));
        setDateRange({ from: lastMonthStart, to: lastMonthEnd });
        break;
      case 'custom':
        // Keep the current custom range
        break;
    }
  }, [dateRangeType]);

  // Format the date range for display
  const formatDateRange = () => {
    if (!dateRange?.from) return '';
    
    if (dateRange.to && dateRange.from !== dateRange.to) {
      return `${format(dateRange.from, 'PPP')} - ${format(dateRange.to, 'PPP')}`;
    }
    
    return format(dateRange.from, 'PPP');
  };

  // Get data from Supabase based on the date range
  const { data: paymentData, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['payment-source-report', dateRange],
    queryFn: async () => {
      // Only proceed if we have valid dates
      if (!dateRange?.from || !isValid(dateRange.from)) {
        return [];
      }
      
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromDate;
      
      // Query the appointments table with the date range
      const { data, error } = await supabase
        .from('appointments')
        .select('created_at, payment_method, total_price')
        .gte('created_at', `${fromDate}T00:00:00`)
        .lte('created_at', `${toDate}T23:59:59`)
        .eq('transaction_type', 'sale');
      
      if (error) throw error;
      
      // Process and group the data by date and payment method
      const groupedData: Record<string, Record<string, number>> = {};
      
      data?.forEach(appointment => {
        // Format the date part
        const date = format(new Date(appointment.created_at), 'yyyy-MM-dd');
        
        // Initialize the date entry if it doesn't exist
        if (!groupedData[date]) {
          groupedData[date] = PAYMENT_METHODS.reduce((acc, method) => ({
            ...acc,
            [method]: 0
          }), {});
        }
        
        // Get payment method or default to 'other'
        const paymentMethod = appointment.payment_method?.toLowerCase() || 'other';
        const methodKey = PAYMENT_METHODS.includes(paymentMethod) ? paymentMethod : 'other';
        
        // Add the amount to the appropriate payment method
        groupedData[date][methodKey] = (groupedData[date][methodKey] || 0) + (appointment.total_price || 0);
      });
      
      // Convert to array format for rendering
      const result = Object.entries(groupedData).map(([date, methods]) => ({
        date,
        ...methods
      }));
      
      // Sort by date
      return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
  });

  // Calculate totals for each payment method
  const calculateTotals = () => {
    if (!paymentData || paymentData.length === 0) return PAYMENT_METHODS.reduce((acc, method) => ({
      ...acc,
      [method]: 0
    }), {});
    
    return PAYMENT_METHODS.reduce((totals, method) => {
      const sum = paymentData.reduce((acc, day) => acc + (day[method] || 0), 0);
      return { ...totals, [method]: sum };
    }, {});
  };
  
  const totals = calculateTotals();
  
  // Prepare data for pie chart
  const prepareChartData = () => {
    return PAYMENT_METHODS.map((method, index) => ({
      name: method.charAt(0).toUpperCase() + method.slice(1),
      value: totals[method] || 0,
      color: COLORS[index % COLORS.length]
    })).filter(item => item.value > 0);
  };
  
  const chartData = prepareChartData();

  // Format currency values
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Export functions
  const exportData = (format: 'pdf' | 'csv' | 'excel' | 'chart') => {
    // In a real app, we would implement actual export functionality here
    toast.success(`Exporting data as ${format.toUpperCase()}...`);
    
    // For CSV and Excel, we could use libraries like csv-stringify or xlsx
    // For PDF, we could use libraries like jspdf or react-pdf
    // For chart export, we could generate a PNG of the chart
    
    console.log(`Exporting payment data as ${format}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h2 className="text-2xl font-bold">Payment by Source</h2>
        </div>
        
        <div className="flex gap-2">
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
              {showChart && (
                <DropdownMenuItem onClick={() => exportData('chart')}>
                  <BarChart4 className="h-4 w-4 mr-2" /> Export Chart
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Select value={dateRangeType} onValueChange={(value: DateRangeType) => setDateRangeType(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="lastWeek">Last Week</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          
          {dateRangeType === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn(
                  "justify-start text-left font-normal w-[200px]",
                  !dateRange && "text-muted-foreground"
                )}>
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    formatDateRange()
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setShowChart(!showChart)} 
            className={cn(showChart && "bg-muted")}
            title={showChart ? "Hide chart" : "Show chart"}
          >
            <BarChart4 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {showChart && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Payment Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            {isLoadingPayments ? (
              <Skeleton className="w-full h-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value as number), 'Amount']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No payment data available for the selected period</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Cash</TableHead>
                  <TableHead>Card</TableHead>
                  <TableHead>Online</TableHead>
                  <TableHead>UPI</TableHead>
                  <TableHead>Wallet</TableHead>
                  <TableHead>Pay Later</TableHead>
                  <TableHead>Other</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingPayments ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: 8 }).map((_, cellIndex) => (
                        <TableCell key={cellIndex}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <>
                    <TableRow className="font-medium">
                      <TableCell>Total</TableCell>
                      {PAYMENT_METHODS.map(method => (
                        <TableCell key={method}>
                          {formatCurrency(totals[method] || 0)}
                        </TableCell>
                      ))}
                    </TableRow>
                    
                    {paymentData && paymentData.length > 0 ? (
                      paymentData.map((day, index) => (
                        <TableRow key={index}>
                          <TableCell>{format(new Date(day.date), 'yyyy-MM-dd')}</TableCell>
                          {PAYMENT_METHODS.map(method => (
                            <TableCell key={method}>
                              {formatCurrency(day[method] || 0)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6">
                          No payment data available for the selected period
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
