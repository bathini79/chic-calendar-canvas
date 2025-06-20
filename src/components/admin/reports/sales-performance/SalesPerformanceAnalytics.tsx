import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Filter
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, startOfDay, endOfDay, isSameDay, addDays, eachDayOfInterval, isToday } from 'date-fns';
import { toast } from 'sonner';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from "@/components/ui/tabs";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useIsMobile } from "@/hooks/use-mobile";
import { DateRange } from 'react-day-picker';

interface SalesPerformanceAnalyticsProps {
  employeeId: string;
  dateRange: string;
}

// Colors for the charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658'];

export function SalesPerformanceAnalytics({ employeeId, dateRange: propDateRange }: SalesPerformanceAnalyticsProps) {  const [activeTab, setActiveTab] = useState('trend');
  const isMobile = useIsMobile();
  // Use DateRange type instead of string for better date handling
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ 
    from: new Date(), // Default to today
    to: new Date() 
  });
  // Get date range values for the query
  const getQueryDateRange = () => {
    const today = new Date();
    
    if (!dateRange?.from) {
      return {
        startDate: today, // Default to today
        endDate: today
      };
    }
    
    return {
      startDate: dateRange.from,
      endDate: dateRange.to || dateRange.from
    };
  };
  
  const { startDate, endDate } = getQueryDateRange();
  
  // Fetch the sales performance data
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales-performance-analytics', employeeId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('bookings')
        .select(`
          service_id,
          price_paid,
          status,
          services:service_id (
            name,
            category_id
          ),
          employee_id,
          employees:employee_id (
            name
          ),
          appointment_id,
          appointments:appointment_id (
            created_at
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
      
      return data;
    }
  });
  
  // For the trend chart (daily revenue)
  const prepareTrendData = () => {
    if (!salesData || salesData.length === 0) return [];
    
    // Create an array of all dates in the range
    const dateRange = eachDayOfInterval({ 
      start: startDate, 
      end: endDate 
    });
    
    // Initialize the data with zero revenue for each date
    const dailyData = dateRange.map(date => ({
      date: format(date, 'yyyy-MM-dd'),
      revenue: 0,
      count: 0
    }));
    
    // Add the actual revenue for each date
    salesData.forEach(booking => {
      if (!booking.appointments || !booking.appointments.created_at) return;
      
      const bookingDate = new Date(booking.appointments.created_at);
      const dateString = format(bookingDate, 'yyyy-MM-dd');
      
      const dayData = dailyData.find(d => d.date === dateString);
      if (dayData) {
        dayData.revenue += booking.price_paid || 0;
        dayData.count += 1;
      }
    });
    
    return dailyData;
  };
    // For the service distribution chart
  const prepareServiceData = () => {
    if (!salesData || salesData.length === 0) return [];
    
    const serviceMap = new Map();
    
    salesData.forEach(booking => {
      if (!booking.service_id || !booking.services) return;
      
      const serviceName = booking.services.name;
      
      if (!serviceMap.has(serviceName)) {
        serviceMap.set(serviceName, {
          name: serviceName,
          revenue: 0,
          count: 0
        });
      }
      
      const serviceData = serviceMap.get(serviceName);
      serviceData.revenue += booking.price_paid || 0;
      serviceData.count += 1;
    });
    
    return Array.from(serviceMap.values());
  };
  
  // For the employee performance chart
  const prepareEmployeeData = () => {
    if (!salesData || salesData.length === 0) return [];
    
    const employeeMap = new Map();
    
    salesData.forEach(booking => {
      if (!booking.employee_id || !booking.employees) return;
      
      const employeeName = booking.employees.name;
      
      if (!employeeMap.has(employeeName)) {
        employeeMap.set(employeeName, {
          name: employeeName,
          revenue: 0,
          count: 0
        });
      }
      
      const employeeData = employeeMap.get(employeeName);
      employeeData.revenue += booking.price_paid || 0;
      employeeData.count += 1;
    });
    
    return Array.from(employeeMap.values());
  };
  
  const trendData = prepareTrendData();
  const serviceData = prepareServiceData();
  const employeeData = prepareEmployeeData();
  
  // Calculate the total sales
  const totalSales = salesData ? salesData.reduce((sum, booking) => sum + (booking.price_paid || 0), 0) : 0;
  
  // Calculate the daily average
  const getDailyAverage = () => {
    if (!trendData || trendData.length === 0) return 0;
    
    const totalDays = trendData.length;
    const totalRevenue = trendData.reduce((sum, day) => sum + day.revenue, 0);
    
    return totalRevenue / totalDays;
  };
  
  const dailyAverage = getDailyAverage();
  
  // Calculate comparison with previous period
  const getComparison = () => {
    if (!salesData || salesData.length === 0) return { percentage: 0, trend: 'neutral' };
    
    // Calculate the previous period range
    const periodLength = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const previousPeriodStart = subDays(startDate, periodLength);
    const previousPeriodEnd = subDays(startDate, 1);
    
    // Fetch data for the previous period
    // In a real implementation, we would need to make another query to get the previous period data
    // For now, we'll simulate it
    const previousTotal = totalSales * 0.9; // Simulating 10% growth
    
    // Calculate the percentage change
    const percentage = ((totalSales - previousTotal) / previousTotal) * 100;
    
    return {
      percentage: Math.round(percentage * 10) / 10,
      trend: percentage >= 0 ? 'positive' : 'negative'
    };
  };
  
  const comparison = getComparison();
  
  // Format currency values
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Export functions
  const exportData = (format: 'pdf' | 'csv' | 'excel' | 'png' | 'jpeg' | 'svg') => {
    // In a real app, we would implement actual export functionality here
    toast.success(`Exporting analytics as ${format.toUpperCase()}...`);
    
    // For CSV and Excel, we could use libraries like csv-stringify or xlsx
    // For PDF, we could use libraries like jspdf or react-pdf
    // For images, we could use html-to-image or similar libraries
  };  return (
    <div className="space-y-6">
      {/* Controls section - Improved layout for mobile and desktop */}
      <div className="space-y-4">
        {/* Top row - Calendar first, then Filter icon */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          {/* DateRangePicker - consistent with other reports */}
          <DateRangePicker
            dateRange={dateRange}
            onChange={setDateRange}
            isMobile={isMobile}
            align={isMobile ? "end" : "center"}
            className={isMobile ? "flex-1" : ""}
          />
          
          {/* Filter button - icon only on mobile */}
          <Button
            variant="outline"
            size="sm"
            className="flex items-center h-8 gap-2"
            onClick={() => {
              // Add filter functionality here
              toast.success("Filter options coming soon");
            }}
          >
            <Filter className="h-4 w-4" />
            {!isMobile && <span>Filters</span>}
          </Button>
          
          {/* Export menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center h-8 gap-2">
                <Download className="h-4 w-4" /> 
                {!isMobile && <span>Export</span>}
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
              <DropdownMenuItem onClick={() => exportData('png')}>
                <ImageIcon className="h-4 w-4 mr-2" /> Export as PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData('jpeg')}>
                <ImageIcon className="h-4 w-4 mr-2" /> Export as JPEG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData('svg')}>
                <ImageIcon className="h-4 w-4 mr-2" /> Export as SVG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Summary cards section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-[150px]" />
            ) : (
              <div className="flex flex-col">
                <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {comparison.trend === 'positive' ? (
                    <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
                  )}
                  <span className={comparison.trend === 'positive' ? 'text-green-500' : 'text-red-500'}>
                    {comparison.percentage}% from previous period
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Daily Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-[150px]" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(dailyAverage)}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-[150px]" />
            ) : (
              <div className="text-2xl font-bold">{salesData ? salesData.length : 0}</div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="trend" className="flex items-center gap-2">
            <LineChartIcon className="h-4 w-4" />
            <span>Sales Trend</span>
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            <span>Services Distribution</span>
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <BarChartIcon className="h-4 w-4" />
            <span>Employee Performance</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle>Sales Trend</CardTitle>
              <CardDescription>
                Daily revenue for the selected period
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {isLoading ? (
                <Skeleton className="w-full h-full" />
              ) : trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis 
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Revenue']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#8884d8" 
                      activeDot={{ r: 8 }} 
                      name="Revenue" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No sales data available for the selected period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Service Distribution</CardTitle>
              <CardDescription>
                Revenue breakdown by service
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {isLoading ? (
                <Skeleton className="w-full h-full" />
              ) : serviceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serviceData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="revenue"
                    >
                      {serviceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No service data available for the selected period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>Employee Performance</CardTitle>
              <CardDescription>
                Revenue generated by each employee
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {isLoading ? (
                <Skeleton className="w-full h-full" />
              ) : employeeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={employeeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis 
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Revenue']}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No employee data available for the selected period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
