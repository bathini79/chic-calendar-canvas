
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
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Image as ImageIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Skeleton } from '@/components/ui/skeleton';
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
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';

interface ServiceCategoryPerformanceProps {
  employeeId: string;
  dateRange: string;
}

// Colors for the charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658'];

export function ServiceCategoryPerformance({ employeeId, dateRange }: ServiceCategoryPerformanceProps) {
  const [activeTab, setActiveTab] = useState('report');
  
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
  
  // Fetch category sales data
  const { data, isLoading } = useQuery({
    queryKey: ['service-category-performance', employeeId, dateRange],
    queryFn: async () => {
      // First get all categories
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name');
      
      if (categoriesError) throw categoriesError;
      
      // Then get all bookings for the selected date range and employee (if specified)
      let query = supabase
        .from('bookings')
        .select(`
          service_id,
          price_paid,
          status,
          services:service_id (
            name,
            category_id,
            duration,
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
      
      const { data: bookings, error: bookingsError } = await query;
      
      if (bookingsError) throw bookingsError;
      
      // Process the data to group by category
      const categoryMap = new Map();
      
      // Initialize categories with zero values
      categories.forEach(category => {
        categoryMap.set(category.id, {
          id: category.id,
          name: category.name,
          count: 0,
          grossSales: 0,
          discount: 0,
          netSales: 0
        });
      });
      
      // Add "Uncategorized" for services without a category
      categoryMap.set('uncategorized', {
        id: 'uncategorized',
        name: 'Uncategorized',
        count: 0,
        grossSales: 0,
        discount: 0,
        netSales: 0
      });
      
      // Process bookings data
      bookings.forEach(booking => {
        if (!booking.service_id || !booking.services) return;
        
        const service = booking.services;
        const categoryId = service.category_id || 'uncategorized';
        
        if (!categoryMap.has(categoryId)) {
          // This could happen if a category was deleted but services still reference it
          categoryMap.set(categoryId, {
            id: categoryId,
            name: 'Unknown Category',
            count: 0,
            grossSales: 0,
            discount: 0,
            netSales: 0
          });
        }
        
        const categoryData = categoryMap.get(categoryId);
        categoryData.count += 1;
        
        // Calculate the original price (gross)
        const originalPrice = service.original_price || service.selling_price;
        categoryData.grossSales += originalPrice;
        
        // Calculate the discount per service
        if (booking.appointments && booking.appointments.discount_value) {
          // For simplicity, we'll distribute discount proportionally
          // In a real app, the exact discount allocation would need to be calculated
          const discount = booking.appointments.discount_value / (bookings.filter(b => b.appointment_id === booking.appointment_id).length);
          categoryData.discount += discount;
        }
        
        // Calculate the net sales
        categoryData.netSales += booking.price_paid;
      });
      
      // Convert the map to an array and sort by net sales descending
      return Array.from(categoryMap.values())
        .filter(cat => cat.count > 0) // Only include categories with sales
        .sort((a, b) => b.netSales - a.netSales);
    }
  });
  
  // Calculate the totals
  const calculateTotals = () => {
    if (!data || data.length === 0) return null;
    
    return data.reduce((totals, category) => ({
      count: totals.count + category.count,
      grossSales: totals.grossSales + category.grossSales,
      discount: totals.discount + category.discount,
      netSales: totals.netSales + category.netSales
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
  
  // Prepare data for the charts
  const prepareChartData = () => {
    if (!data || data.length === 0) return [];
    return data.map(category => ({
      name: category.name,
      value: category.netSales,
      count: category.count
    }));
  };
  
  const chartData = prepareChartData();
  
  // Export functions
  const exportData = (format: 'pdf' | 'csv' | 'excel' | 'png') => {
    // In a real app, we would implement actual export functionality here
    toast.success(`Exporting data as ${format.toUpperCase()}...`);
    
    // For CSV and Excel, we could use libraries like csv-stringify or xlsx
    // For PDF, we could use libraries like jspdf or react-pdf
    console.log(`Exporting category sales data as ${format}`);
  };
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <div className="flex justify-between items-center">
        <TabsList>
          <TabsTrigger value="report" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Report</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChartIcon className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>
        
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <TabsContent value="report" className="space-y-4">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Category</TableHead>
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
                    data.map((category, index) => (
                      <TableRow key={index}>
                        <TableCell>{category.name}</TableCell>
                        <TableCell className="text-right">{category.count}</TableCell>
                        <TableCell className="text-right">{formatCurrency(category.grossSales)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(category.discount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(category.netSales)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6">
                        No category sales data available for the selected criteria
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
      </TabsContent>

      <TabsContent value="analytics" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Sales by Category</h3>
              <div className="h-[300px]">
                {isLoading ? (
                  <Skeleton className="w-full h-full" />
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4">Category Service Counts</h3>
              <div className="h-[300px]">
                {isLoading ? (
                  <Skeleton className="w-full h-full" />
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [value, 'Services Count']} />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-4">Category Revenue Comparison</h3>
            <div className="h-[300px]">
              {isLoading ? (
                <Skeleton className="w-full h-full" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `₹${value}`} />
                    <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
                    <Legend />
                    <Bar dataKey="value" name="Net Sales" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
