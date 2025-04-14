
import React, { useState, useEffect } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  LineChart,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Download, 
  ArrowLeft, 
  FileText, 
  FileSpreadsheet,
  BarChart2,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from '@/components/ui/chart';

type SalesByEmployeeProps = {
  onBack: () => void;
  employeeId: string;
  dateRange: string;
};

export function SalesByEmployee({ onBack, employeeId, dateRange }: SalesByEmployeeProps) {
  const [activeTab, setActiveTab] = useState('report');
  const [activeChart, setActiveChart] = useState('revenue');
  
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
  
  // Fetch the sales by employee data
  const { data, isLoading } = useQuery({
    queryKey: ['sales-by-employee', employeeId, dateRange],
    queryFn: async () => {
      let query = supabase
        .from('bookings')
        .select(`
          id,
          price_paid,
          status,
          appointment_id,
          appointments(
            id,
            created_at,
            customer_id,
            total_price,
            discount_value,
            tax_amount,
            discount_type,
            profiles(full_name),
            points_discount_amount
          ),
          service_id,
          services(
            name,
            selling_price,
            original_price
          ),
          package_id,
          packages(
            name,
            price
          ),
          employee_id,
          employees(
            name
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
      
      return data || [];
    }
  });
  
  // Format the currency values
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Generate analytics data
  const generateAnalyticsData = () => {
    if (!data || data.length === 0) return [];
    
    // Group by employee for employee performance
    const employeePerformanceMap = new Map();
    
    data.forEach(booking => {
      if (!booking.employee_id || !booking.employees) return;
      
      const employeeId = booking.employee_id;
      const employeeName = booking.employees.name;
      
      if (!employeePerformanceMap.has(employeeId)) {
        employeePerformanceMap.set(employeeId, {
          name: employeeName,
          services: 0,
          revenue: 0,
          discount: 0
        });
      }
      
      const employeeData = employeePerformanceMap.get(employeeId);
      employeeData.services += 1;
      employeeData.revenue += booking.price_paid || 0;
      
      // Calculate discount per booking
      const originalPrice = booking.services?.original_price || booking.services?.selling_price || 
                           booking.packages?.price || 0;
      const pricePaid = booking.price_paid || 0;
      const discount = Math.max(0, originalPrice - pricePaid);
      employeeData.discount += discount;
    });
    
    return Array.from(employeePerformanceMap.values());
  };
  
  // Generate service sales data
  const generateServiceSalesData = () => {
    if (!data || data.length === 0) return [];
    
    // Group by service for service sales
    const serviceSalesMap = new Map();
    
    data.forEach(booking => {
      if (!booking.service_id && !booking.package_id) return;
      
      const serviceName = booking.services?.name || booking.packages?.name || 'Unknown';
      const serviceId = booking.service_id || booking.package_id;
      
      if (!serviceSalesMap.has(serviceId)) {
        serviceSalesMap.set(serviceId, {
          name: serviceName,
          count: 0,
          revenue: 0
        });
      }
      
      const serviceData = serviceSalesMap.get(serviceId);
      serviceData.count += 1;
      serviceData.revenue += booking.price_paid || 0;
    });
    
    return Array.from(serviceSalesMap.values());
  };
  
  const analyticsData = generateAnalyticsData();
  const serviceSalesData = generateServiceSalesData();
  
  // Export functions
  const exportData = (format: 'pdf' | 'csv' | 'excel') => {
    // In a real app, we would implement actual export functionality here
    toast.success(`Exporting data as ${format.toUpperCase()}...`);
    
    // For CSV and Excel, we could use libraries like csv-stringify or xlsx
    // For PDF, we could use libraries like jspdf or react-pdf
    console.log(`Exporting sales by employee data as ${format}`);
  };
  
  // Define COLORS for the pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];
  
  // Calculate totals for the table footer
  const calculateTotals = () => {
    if (!data || data.length === 0) return null;
    
    return data.reduce((totals, booking) => {
      const serviceSold = 1; // Each booking represents one service sold
      const preDiscountPrice = booking.services?.original_price || 
                               booking.services?.selling_price || 
                               booking.packages?.price || 0;
      const netPrice = booking.price_paid || 0;
      const discount = Math.max(0, preDiscountPrice - netPrice);
      const tax = booking.appointments?.tax_amount || 0;
      
      return {
        serviceSold: totals.serviceSold + serviceSold,
        preDiscountPrice: totals.preDiscountPrice + preDiscountPrice,
        netPrice: totals.netPrice + netPrice,
        discount: totals.discount + discount,
        tax: totals.tax + tax,
        total: totals.total + netPrice
      };
    }, { serviceSold: 0, preDiscountPrice: 0, netPrice: 0, discount: 0, tax: 0, total: 0 });
  };
  
  const totals = calculateTotals();
  
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
          <h2 className="text-2xl font-bold">Sales by Employee</h2>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="report" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Report</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="report" className="space-y-4">
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
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Booking Date</TableHead>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Employee Name</TableHead>
                      <TableHead>Service Name</TableHead>
                      <TableHead className="text-right">Service Sold</TableHead>
                      <TableHead className="text-right">Pre-Discount Price</TableHead>
                      <TableHead className="text-right">Net Price</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                          {Array.from({ length: 12 }).map((_, cellIndex) => (
                            <TableCell key={cellIndex}>
                              <Skeleton className="h-6 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : data && data.length > 0 ? (
                      data.map((booking, index) => {
                        const serviceName = booking.services?.name || booking.packages?.name || 'Unknown';
                        const preDiscountPrice = booking.services?.original_price || 
                                               booking.services?.selling_price || 
                                               booking.packages?.price || 0;
                        const netPrice = booking.price_paid || 0;
                        const discount = Math.max(0, preDiscountPrice - netPrice);
                        const tax = booking.appointments?.tax_amount || 0;
                        const invoiceId = `INV-${String(index + 7940).padStart(6, '0')}`;
                        
                        return (
                          <TableRow key={booking.id}>
                            <TableCell>{booking.appointment_id?.substring(0, 8)}</TableCell>
                            <TableCell>
                              {booking.appointments?.created_at 
                                ? format(new Date(booking.appointments.created_at), 'yyyy-MM-dd HH:mm:ss') 
                                : '--'}
                            </TableCell>
                            <TableCell>{invoiceId}</TableCell>
                            <TableCell>
                              {booking.appointments?.profiles?.full_name || '--'}
                            </TableCell>
                            <TableCell>{booking.employees?.name || '--'}</TableCell>
                            <TableCell>{serviceName}</TableCell>
                            <TableCell className="text-right">1</TableCell>
                            <TableCell className="text-right">{formatCurrency(preDiscountPrice)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(netPrice)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(discount)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(tax)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(netPrice)}</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-6">
                          No sales data available for the selected criteria
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  {totals && (
                    <TableFooter>
                      <TableRow>
                        <TableCell className="font-medium">Total</TableCell>
                        <TableCell>--</TableCell>
                        <TableCell>--</TableCell>
                        <TableCell>--</TableCell>
                        <TableCell>--</TableCell>
                        <TableCell>--</TableCell>
                        <TableCell className="text-right">{totals.serviceSold}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totals.preDiscountPrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totals.netPrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totals.discount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totals.tax)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totals.total)}</TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sales Analytics</CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={activeChart === 'revenue' ? 'bg-primary text-primary-foreground' : ''}
                  onClick={() => setActiveChart('revenue')}
                >
                  <BarChart3 className="h-4 w-4 mr-1" /> Revenue
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={activeChart === 'services' ? 'bg-primary text-primary-foreground' : ''}
                  onClick={() => setActiveChart('services')}
                >
                  <PieChartIcon className="h-4 w-4 mr-1" /> Services
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={activeChart === 'performance' ? 'bg-primary text-primary-foreground' : ''}
                  onClick={() => setActiveChart('performance')}
                >
                  <LineChartIcon className="h-4 w-4 mr-1" /> Performance
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="ml-2">
                      <Download className="h-4 w-4 mr-1" /> Export
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
            </CardHeader>
            <CardContent>
              {activeChart === 'revenue' && (
                <div className="h-80">
                  <ChartContainer
                    config={{
                      revenue: {
                        label: "Revenue",
                        color: "#0088FE"
                      },
                      discount: {
                        label: "Discount",
                        color: "#FFBB28"
                      }
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="revenue" name="revenue" fill="var(--color-revenue)" />
                        <Bar dataKey="discount" name="discount" fill="var(--color-discount)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              )}
              
              {activeChart === 'services' && (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceSalesData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="revenue"
                      >
                        {serviceSalesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [formatCurrency(value as number), "Revenue"]}
                        labelFormatter={(name) => `Service: ${name}`}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              
              {activeChart === 'performance' && (
                <div className="h-80">
                  <ChartContainer
                    config={{
                      services: {
                        label: "Services",
                        color: "#8884D8"
                      },
                      revenue: {
                        label: "Revenue",
                        color: "#82CA9D"
                      }
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" orientation="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="services" 
                          name="services" 
                          stroke="var(--color-services)" 
                          activeDot={{ r: 8 }}
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="revenue" 
                          name="revenue" 
                          stroke="var(--color-revenue)" 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
