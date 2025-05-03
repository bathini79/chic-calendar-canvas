import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRange } from 'react-day-picker';
import { format, subDays } from 'date-fns';
import { Download, Filter, Users, TrendingUp, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';

type CustomerSalesReportProps = {
  employeeId: string;
  dateRange: "30" | "90" | "365" | "custom";
};

type CustomerSalesData = {
  id: string;
  full_name: string;
  gender: string;
  total_paid: number;
  total_appointments: number;
  first_appointment: string;
  last_appointment: string;
};

export const CustomerSalesReport = ({ employeeId, dateRange }: CustomerSalesReportProps) => {
  const [dateRangeValue, setDateRangeValue] = useState<DateRange | undefined>();
  const [activeTab, setActiveTab] = useState<string>("report");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [membershipFilter, setMembershipFilter] = useState<string>("all");
  const [locationOptions, setLocationOptions] = useState<{ id: string; name: string }[]>([]);
  const [membershipOptions, setMembershipOptions] = useState<{ id: string; name: string }[]>([]);
  
  // Prepare date range based on selected option
  useEffect(() => {
    const endDate = new Date();
    let startDate;
    
    if (dateRange === "30") {
      startDate = subDays(endDate, 30);
    } else if (dateRange === "90") {
      startDate = subDays(endDate, 90);
    } else if (dateRange === "365") {
      startDate = subDays(endDate, 365);
    } else {
      // Custom - Keep existing date range or default to 30 days
      if (!dateRangeValue) {
        startDate = subDays(endDate, 30);
      } else {
        return; // Custom date range already set
      }
    }
    
    setDateRangeValue({
      from: startDate,
      to: endDate
    });
  }, [dateRange]);
  
  // Fetch locations for filtering
  useEffect(() => {
    const fetchLocations = async () => {
      const { data } = await supabase
        .from('locations')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (data) {
        setLocationOptions(data);
      }
    };
    
    fetchLocations();
  }, []);
  
  // Fetch memberships for filtering
  useEffect(() => {
    const fetchMemberships = async () => {
      const { data } = await supabase
        .from('memberships')
        .select('id, name')
        .order('name');
      
      if (data) {
        setMembershipOptions(data);
      }
    };
    
    fetchMemberships();
  }, []);

  // Fetch customer sales data
  const { data: customerSalesData, isLoading } = useQuery({
    queryKey: ['customer-sales', dateRangeValue?.from, dateRangeValue?.to, employeeId, genderFilter, locationFilter, membershipFilter],
    queryFn: async () => {
      if (!dateRangeValue?.from || !dateRangeValue?.to) return [];
      
      const startDate = format(dateRangeValue.from, 'yyyy-MM-dd');
      const endDate = format(dateRangeValue.to, 'yyyy-MM-dd');
      
      let query = supabase
        .from('appointments')
        .select(`
          id,
          customer_id,
          start_time,
          total_price,
          profiles!appointments_customer_id_fkey (
            id,
            full_name,
            gender
          )
        `)
        .gte('start_time', `${startDate}T00:00:00`)
        .lte('start_time', `${endDate}T23:59:59`)
        .eq('transaction_type', 'sale');
      
      if (employeeId !== "all") {
        query = query.filter('bookings.employee_id', 'eq', employeeId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching customer sales data:', error);
        return [];
      }
      
      // Process data to get per-customer totals
      const customerMap = new Map<string, CustomerSalesData>();
      
      data.forEach(appointment => {
        if (!appointment.profiles || !appointment.profiles.id) return;
        
        const customerId = appointment.profiles.id;
        const appointmentDate = new Date(appointment.start_time);
        
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            id: customerId,
            full_name: appointment.profiles.full_name || 'Unknown',
            gender: appointment.profiles.gender || 'Unknown',
            total_paid: 0,
            total_appointments: 0,
            first_appointment: appointment.start_time,
            last_appointment: appointment.start_time
          });
        }
        
        const customer = customerMap.get(customerId)!;
        customer.total_paid += parseFloat(appointment.total_price) || 0;
        customer.total_appointments += 1;
        
        // Update first and last appointment dates
        if (new Date(appointment.start_time) < new Date(customer.first_appointment)) {
          customer.first_appointment = appointment.start_time;
        }
        if (new Date(appointment.start_time) > new Date(customer.last_appointment)) {
          customer.last_appointment = appointment.start_time;
        }
      });
      
      // Convert to array and sort by total_paid in descending order
      return Array.from(customerMap.values())
        .sort((a, b) => b.total_paid - a.total_paid);
    },
    enabled: !!dateRangeValue?.from && !!dateRangeValue?.to
  });
  
  // Apply filters to data
  const filteredData = React.useMemo(() => {
    if (!customerSalesData) return [];
    
    return customerSalesData.filter(customer => {
      // Apply gender filter
      if (genderFilter !== 'all' && customer.gender !== genderFilter) {
        return false;
      }
      
      // Note: Location and membership filters would be applied here
      // but they require additional data joins that would be implemented
      // in the backend query
      
      return true;
    });
  }, [customerSalesData, genderFilter, locationFilter, membershipFilter]);
  
  // Calculate grand total
  const grandTotal = React.useMemo(() => {
    return filteredData.reduce((sum, customer) => sum + customer.total_paid, 0);
  }, [filteredData]);
  
  // Prepare data for top customers chart
  const topCustomersData = React.useMemo(() => {
    return filteredData.slice(0, 10).map(customer => ({
      name: customer.full_name,
      total: customer.total_paid
    }));
  }, [filteredData]);
  
  // Prepare data for trend chart (this would ideally come from a time-series query)
  // For now, we'll simulate it with available data
  const trendData = React.useMemo(() => {
    if (!dateRangeValue?.from || !dateRangeValue?.to || !customerSalesData) return [];
    
    // Create a map of dates
    const dateMap = new Map<string, number>();
    const days = Math.min(
      Math.round((dateRangeValue.to.getTime() - dateRangeValue.from.getTime()) / (1000 * 60 * 60 * 24)),
      30 // Limit to 30 data points for readability
    );
    
    // Initialize with zeros
    for (let i = 0; i < days; i++) {
      const date = new Date(dateRangeValue.to);
      date.setDate(date.getDate() - i);
      dateMap.set(format(date, 'yyyy-MM-dd'), 0);
    }
    
    // Aggregate data by date
    customerSalesData.forEach(customer => {
      const firstDate = format(new Date(customer.first_appointment), 'yyyy-MM-dd');
      if (dateMap.has(firstDate)) {
        dateMap.set(firstDate, (dateMap.get(firstDate) || 0) + customer.total_paid);
      }
    });
    
    // Convert to array for chart
    return Array.from(dateMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [dateRangeValue, customerSalesData]);
  
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Handle export
  const handleExport = (format: 'xlsx' | 'csv' | 'pdf') => {
    // Implementation for exporting would go here
    alert(`Export to ${format} initiated. This functionality would be implemented with appropriate libraries.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-medium">Customer Sales Report</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {dateRangeValue?.from && dateRangeValue?.to
              ? `${format(dateRangeValue.from, 'MMM dd, yyyy')} - ${format(dateRangeValue.to, 'MMM dd, yyyy')}`
              : 'Select date range'}
          </span>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={genderFilter} onValueChange={setGenderFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Gender: All" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Gender</SelectLabel>
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Location: All" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Location</SelectLabel>
              <SelectItem value="all">All Locations</SelectItem>
              {locationOptions.map(location => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        
        <Select value={membershipFilter} onValueChange={setMembershipFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Membership: All" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Membership</SelectLabel>
              <SelectItem value="all">All Memberships</SelectItem>
              <SelectItem value="none">No Membership</SelectItem>
              {membershipOptions.map(membership => (
                <SelectItem key={membership.id} value={membership.id}>
                  {membership.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="report">
            Report
          </TabsTrigger>
          <TabsTrigger value="analytics">
            Analytics
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="report" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">
                Customer Sales Report
              </CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Export <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                    Export to Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    Export to CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    Export to PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : filteredData.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead className="text-right">Total Paid</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">{customer.full_name}</TableCell>
                          <TableCell>{customer.gender || 'Not specified'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(customer.total_paid)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-medium">
                        <TableCell colSpan={2} className="text-right">Grand Total</TableCell>
                        <TableCell className="text-right">{formatCurrency(grandTotal)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  No customer sales data found for the selected criteria.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">
                  Top 10 Customers by Sales
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Export <ChevronDown className="ml-1 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                      Export to Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('csv')}>
                      Export to CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('pdf')}>
                      Export to PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="h-[350px]">
                {isLoading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <Skeleton className="h-full w-full rounded-md" />
                  </div>
                ) : topCustomersData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topCustomersData}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis 
                        dataKey="name" 
                        type="category"
                        width={80}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        formatter={(value) => [formatCurrency(value as number), 'Total Sales']}
                      />
                      <Bar dataKey="total" name="Total Sales" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No data available for the selected time period
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">
                  Sales Trend Over Time
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Export <ChevronDown className="ml-1 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                      Export to Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('csv')}>
                      Export to CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('pdf')}>
                      Export to PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="h-[350px]">
                {isLoading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <Skeleton className="h-full w-full rounded-md" />
                  </div>
                ) : trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trendData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        angle={-45} 
                        textAnchor="end"
                        height={80}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [formatCurrency(value as number), 'Sales Amount']}
                        labelFormatter={(label) => format(new Date(label), 'MMM dd, yyyy')}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        name="Sales Amount" 
                        stroke="#8884d8" 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No data available for the selected time period
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">
                Customer Sales Distribution
              </CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Export <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                    Export to Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    Export to CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    Export to PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="h-[350px]">
              {isLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Skeleton className="h-full w-full rounded-md" />
                </div>
              ) : filteredData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topCustomersData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value as number), 'Total Sales']}
                    />
                    <Bar dataKey="total" name="Total Sales" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No data available for the selected time period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
