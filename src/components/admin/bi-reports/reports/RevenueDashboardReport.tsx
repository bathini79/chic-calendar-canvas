import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, Calendar, Users, Filter, MapPin, X, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type DateRange = '7' | '30' | '90' | '365';

interface Location {
  id: string;
  name: string;
}

interface RevenueData {
  date: string;
  revenue: number;
  appointments: number;
}

interface RevenueSummary {
  totalRevenue: number;
  totalAppointments: number;
  averageBookingValue: number;
  growthPercentage: number;
}

interface TopTeamMember {
  id: string;
  name: string;
  photo_url?: string | null;
  revenue: number;
  appointments: number;
}

export function RevenueDashboardReport() {
  const [dateRange, setDateRange] = useState<DateRange>('30');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Fetch locations for the filter dropdown
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as Location[];
    }
  });  const { data: revenueData, isLoading } = useQuery({
    queryKey: ['revenue-dashboard', dateRange, selectedLocationId],
    queryFn: async () => {
      const days = parseInt(dateRange);
      const endDate = new Date();
      const startDate = subDays(endDate, days - 1);
      const previousStartDate = subDays(startDate, days);      // Single optimized query to get all appointment data we need
      let currentPeriodQuery = supabase
        .from('appointments')
        .select(`
          total_price,
          start_time,
          status,
          bookings(
            employee_id,
            price_paid,
            employees!bookings_employee_id_fkey(id, name, photo_url)
          )
        `)
        .eq('status', 'completed')
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString());

      // Add location filter if selected
      if (selectedLocationId) {
        currentPeriodQuery = currentPeriodQuery.eq('location', selectedLocationId);
      }

      // Query for previous period (for growth calculation)
      let previousPeriodQuery = supabase
        .from('appointments')
        .select('total_price')
        .eq('status', 'completed')
        .gte('start_time', previousStartDate.toISOString())
        .lt('start_time', startDate.toISOString());

      // Add location filter for previous period if selected
      if (selectedLocationId) {
        previousPeriodQuery = previousPeriodQuery.eq('location', selectedLocationId);
      }

      // Execute both queries in parallel
      const [
        { data: currentAppointments, error: currentError },
        { data: previousAppointments, error: prevError }
      ] = await Promise.all([
        currentPeriodQuery,
        previousPeriodQuery
      ]);

      if (currentError) throw currentError;
      if (prevError) throw prevError;

      // Process current period data
      const dailyData: RevenueData[] = [];
      const dailyMap = new Map<string, { revenue: number; appointments: number }>();
      
      // Initialize all days with zero values
      for (let i = 0; i < days; i++) {
        const date = subDays(endDate, days - 1 - i);
        const dateKey = format(date, 'MMM dd');
        dailyMap.set(dateKey, { revenue: 0, appointments: 0 });
      }

      // Process appointments and group by day
      let totalRevenue = 0;
      let totalAppointments = 0;
      const employeeStats = new Map();

      currentAppointments?.forEach(appointment => {
        const appointmentDate = new Date(appointment.start_time);
        const dateKey = format(appointmentDate, 'MMM dd');
        const revenue = appointment.total_price || 0;
        
        // Update daily totals
        const dayData = dailyMap.get(dateKey);
        if (dayData) {
          dayData.revenue += revenue;
          dayData.appointments += 1;
        }
        
        // Update overall totals
        totalRevenue += revenue;
        totalAppointments += 1;        // Process employee stats for top team members
        appointment.bookings?.forEach(booking => {
          if (!booking.employee_id || !booking.employees) return;
          
          const employeeId = booking.employee_id;
          const employee = booking.employees;
          const bookingRevenue = booking.price_paid || 0;
          
          if (employeeStats.has(employeeId)) {
            const existing = employeeStats.get(employeeId);
            employeeStats.set(employeeId, {
              ...existing,
              revenue: existing.revenue + bookingRevenue,
              appointments: existing.appointments + 1
            });
          } else {
            employeeStats.set(employeeId, {
              id: employeeId,
              name: employee.name,
              photo_url: employee.photo_url,
              revenue: bookingRevenue,
              appointments: 1
            });
          }
        });
      });

      // Convert daily map to array
      dailyMap.forEach((data, dateKey) => {
        dailyData.push({
          date: dateKey,
          revenue: data.revenue,
          appointments: data.appointments
        });
      });

      // Calculate growth percentage
      const previousRevenue = previousAppointments?.reduce((sum, apt) => sum + (apt.total_price || 0), 0) || 0;
      const growthPercentage = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
      
      const summary: RevenueSummary = {
        totalRevenue,
        totalAppointments,
        averageBookingValue: totalAppointments > 0 ? totalRevenue / totalAppointments : 0,
        growthPercentage
      };

      // Sort by revenue and get top 5 team members
      const topTeamMembers: TopTeamMember[] = Array.from(employeeStats.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      return { dailyData, summary, topTeamMembers };
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get selected location name for display
  const selectedLocation = locations?.find(loc => loc.id === selectedLocationId);
  const selectedLocationText = selectedLocationId 
    ? selectedLocation?.name || 'Unknown Location'
    : 'All Locations';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {selectedLocationId && (
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                    1
                  </span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md w-full max-w-[95vw] h-[90vh] sm:h-auto flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Filters
                </DialogTitle>
                <DialogDescription>
                  Filter your revenue dashboard data by location
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto space-y-6 py-4">
                {/* Location Filter */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      Location
                    </label>
                    {selectedLocationId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLocationId(null)}
                        className="text-xs h-auto py-1 px-2"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <span className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2" />
                          {selectedLocationText}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ▼
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full min-w-[200px]" align="start">
                      <DropdownMenuItem 
                        onClick={() => setSelectedLocationId(null)}
                        className={selectedLocationId === null ? "bg-accent" : ""}
                      >
                        <div className="flex items-center w-full">
                          {selectedLocationId === null && <Check className="h-4 w-4 mr-2" />}
                          <span className={selectedLocationId === null ? "" : "ml-6"}>
                            All Locations
                          </span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {locations?.map((location) => (
                        <DropdownMenuItem
                          key={location.id}
                          onClick={() => setSelectedLocationId(location.id)}
                          className={selectedLocationId === location.id ? "bg-accent" : ""}
                        >
                          <div className="flex items-center w-full">
                            {selectedLocationId === location.id && <Check className="h-4 w-4 mr-2" />}
                            <span className={selectedLocationId === location.id ? "" : "ml-6"}>
                              {location.name}
                            </span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setFiltersOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setFiltersOpen(false)}
                >
                  Apply Filters
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <Select value={dateRange} onValueChange={(value: DateRange) => setDateRange(value)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-[120px]" />
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(revenueData?.summary.totalRevenue || 0)}
              </div>            )}
            <p className="text-xs text-muted-foreground">
              {selectedLocationId 
                ? `${locations?.find(l => l.id === selectedLocationId)?.name || 'Selected location'} - Last ${dateRange} days`
                : `All locations - Last ${dateRange} days`
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-[80px]" />
            ) : (
              <div className="text-2xl font-bold">
                {revenueData?.summary.totalAppointments || 0}
              </div>            )}
            <p className="text-xs text-muted-foreground">
              {selectedLocationId 
                ? `${locations?.find(l => l.id === selectedLocationId)?.name || 'Selected location'} - Completed bookings`
                : 'All locations - Completed bookings'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Booking Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-[100px]" />
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(revenueData?.summary.averageBookingValue || 0)}
              </div>            )}
            <p className="text-xs text-muted-foreground">
              {selectedLocationId 
                ? `${locations?.find(l => l.id === selectedLocationId)?.name || 'Selected location'} - Per appointment`
                : 'All locations - Per appointment'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth</CardTitle>
            {(revenueData?.summary.growthPercentage || 0) >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-[80px]" />
            ) : (
              <div className={`text-2xl font-bold ${
                (revenueData?.summary.growthPercentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(revenueData?.summary.growthPercentage || 0).toFixed(1)}%
              </div>            )}
            <p className="text-xs text-muted-foreground">
              {selectedLocationId 
                ? `${locations?.find(l => l.id === selectedLocationId)?.name || 'Selected location'} - vs previous period`
                : 'All locations - vs previous period'
              }
            </p>
          </CardContent>
        </Card>
      </div>      {/* Charts */}
      <div className="grid gap-3 lg:gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="col-span-1 lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-2 px-3 pt-3 lg:pb-6 lg:px-6 lg:pt-6">
            <CardTitle className="text-base lg:text-lg">Revenue Trend</CardTitle>
            <CardDescription className="text-xs lg:text-sm">
              {selectedLocationId 
                ? `Daily revenue for ${locations?.find(l => l.id === selectedLocationId)?.name || 'selected location'} over the selected period`
                : 'Daily revenue across all locations over the selected period'
              }
            </CardDescription>
          </CardHeader>          <CardContent className="p-0 lg:p-6">
            <div className="h-[320px] max-h-[320px] sm:h-[380px] sm:max-h-[380px] lg:h-[400px] lg:max-h-[400px] w-full overflow-hidden">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={revenueData?.dailyData || []} 
                    margin={{ 
                      top: 10, 
                      right: 10, 
                      left: 5, 
                      bottom: 50 
                    }}
                  >                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      interval={revenueData?.dailyData && revenueData.dailyData.length > 15 ? Math.floor(revenueData.dailyData.length / 5) : 0}
                      angle={-45}
                      textAnchor="end"
                      height={50}
                      tick={{ fill: '#666', fontSize: 10 }}
                      className="text-[10px] sm:text-[11px] lg:text-[12px]"
                    />
                    <YAxis 
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => value > 1000 ? `₹${(value/1000).toFixed(0)}k` : `₹${value}`}
                      width={40}
                      tick={{ fill: '#666', fontSize: 10 }}
                      className="text-[10px] sm:text-[11px] lg:text-[12px] lg:!w-[50px]"
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                      labelStyle={{ color: '#333' }}
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                      dot={{ fill: '#2563eb', strokeWidth: 1, r: 3 }}
                      activeDot={{ r: 5, stroke: '#2563eb', strokeWidth: 2, fill: '#fff' }}
                      className="lg:!stroke-[3px]"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>        <Card className="col-span-1 lg:col-span-1 overflow-hidden">
          <CardHeader className="pb-2 px-3 pt-3 lg:pb-6 lg:px-6 lg:pt-6">
            <CardTitle className="text-base lg:text-lg">Daily Appointments</CardTitle>
            <CardDescription className="text-xs lg:text-sm">
              {selectedLocationId 
                ? `Number of completed appointments per day for ${locations?.find(l => l.id === selectedLocationId)?.name || 'selected location'}`
                : 'Number of completed appointments per day across all locations'
              }
            </CardDescription>
          </CardHeader>          <CardContent className="p-0 lg:p-6">
            <div className="h-[320px] max-h-[320px] sm:h-[380px] sm:max-h-[380px] lg:h-[400px] lg:max-h-[400px] w-full overflow-hidden">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData?.dailyData || []} margin={{ top: 10, right: 10, left: 5, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      interval={revenueData?.dailyData && revenueData.dailyData.length > 15 ? Math.floor(revenueData.dailyData.length / 6) : 0}
                      angle={-45}
                      textAnchor="end"
                      height={50}
                      tick={{ fill: '#666', fontSize: 10 }}
                      className="text-[10px] sm:text-[11px] lg:text-[12px]"
                    />                    <YAxis 
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      tick={{ fill: '#666', fontSize: 10 }}
                      className="text-[10px] sm:text-[11px] lg:text-[12px] lg:!w-[50px]"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="appointments" 
                      fill="#16a34a" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Top 5 Team Members</span>
          </CardTitle>          <CardDescription>
            {selectedLocationId 
              ? `Top performing team members by total sales value and appointment count for ${locations?.find(l => l.id === selectedLocationId)?.name || 'selected location'}`
              : 'Top performing team members by total sales value and appointment count across all locations'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-[140px] mb-2" />
                    <Skeleton className="h-3 w-[100px]" />
                  </div>
                  <Skeleton className="h-4 w-[80px]" />
                </div>
              ))}
            </div>
          ) : revenueData?.topTeamMembers && revenueData.topTeamMembers.length > 0 ? (            <div className="space-y-4">
              {revenueData.topTeamMembers.map((member, index) => (
                <div key={member.id} className="flex items-center space-x-4 p-3 rounded-lg border">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.photo_url || undefined} alt={member.name} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{member.name}</h4>
                    <div className="text-sm text-gray-500">
                      {member.appointments} appointments
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(member.revenue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No team member data available for this period</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
