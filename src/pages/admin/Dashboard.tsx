import React, { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shell } from "@/components/ui/shell";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  price_paid: number;
  service_id: string;
  package_id: string;
}

interface Service {
  id: string;
  name: string;
}

interface Package {
  id: string;
  name: string;
}

const Dashboard = () => {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [averageBookingValue, setAverageBookingValue] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [topTeamMembers, setTopTeamMembers] = useState<
    { id: string; name: string; count: number; revenue: number }[]
  >([]);
  const [topTeamMembersError, setTopTeamMembersError] = useState<string | null>(null);
  const [isLoadingTopTeamMembers, setIsLoadingTopTeamMembers] = useState(true);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [isLoadingRevenueData, setIsLoadingRevenueData] = useState(true);
  const [revenueDataError, setRevenueDataError] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: locationData } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("status", "active");
      if (error) throw error;
      return data || [];
    }
  });

  useEffect(() => {
    fetchBookings();
    fetchServices();
    fetchPackages();
    fetchTopEmployees();
    fetchRevenueData();
  }, [date]);

  const fetchBookings = async () => {
    try {
      let query = supabase
        .from("bookings")
        .select("id, start_time, end_time, price_paid, service_id, package_id");

      if (date) {
        const formattedDate = format(date, "yyyy-MM-dd");
        query = query.gte("start_time", `${formattedDate} 00:00:00`)
          .lte("start_time", `${formattedDate} 23:59:59`);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setBookings(data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase.from("services").select("id, name");
      if (error) {
        throw error;
      }
      setServices(data || []);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast({
        title: "Error",
        description: "Failed to load services",
        variant: "destructive",
      });
    }
  };

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase.from("packages").select("id, name");
      if (error) {
        throw error;
      }
      setPackages(data || []);
    } catch (error) {
      console.error("Error fetching packages:", error);
      toast({
        title: "Error",
        description: "Failed to load packages",
        variant: "destructive",
      });
    }
  };

  const fetchTopEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('employee_id, employees(*)')
        .not('employee_id', 'is', null)
        .eq('status', 'completed');
        
      if (error) throw error;
      
      const employeeCounts: Record<string, { id: string; name: string; count: number; revenue: number }> = {};
      
      data.forEach((booking: any) => {
        const employeeId = booking.employee_id;
        if (!employeeId) return;
        
        if (!employeeCounts[employeeId]) {
          employeeCounts[employeeId] = {
            id: employeeId,
            name: booking.employees?.name || 'Unknown',
            count: 0,
            revenue: 0
          };
        }
        
        employeeCounts[employeeId].count += 1;
        // Add revenue calculation if you have price_paid in bookings
      });
      
      const topEmployees = Object.values(employeeCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
        
      setTopTeamMembers(topEmployees);
    } catch (error) {
      console.error('Error fetching top employees:', error);
      setTopTeamMembersError('Failed to load top team members');
    } finally {
      setIsLoadingTopTeamMembers(false);
    }
  }, []);

  const fetchRevenueData = useCallback(async () => {
    setIsLoadingRevenueData(true);
    setRevenueDataError(null);

    try {
      let query = supabase
        .from('bookings')
        .select('start_time, price_paid');

      if (date) {
        const formattedDate = format(date, "yyyy-MM-dd");
        query = query.gte("start_time", `${formattedDate} 00:00:00`)
          .lte("start_time", `${formattedDate} 23:59:59`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate revenue by hour
      const aggregatedData = data?.reduce((acc: any, booking: any) => {
        const hour = new Date(booking.start_time).getHours();
        if (!acc[hour]) {
          acc[hour] = { hour: hour, revenue: 0 };
        }
        acc[hour].revenue += booking.price_paid;
        return acc;
      }, {});

      // Convert aggregated data to array format for recharts
      const chartData = Object.keys(aggregatedData)
        .map((hour) => ({
          hour: parseInt(hour),
          revenue: aggregatedData[hour].revenue,
        }))
        .sort((a, b) => a.hour - b.hour);

      setRevenueData(chartData);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      setRevenueDataError('Failed to load revenue data');
    } finally {
      setIsLoadingRevenueData(false);
    }
  }, [date]);

  useEffect(() => {
    if (bookings.length > 0) {
      const totalRevenue = bookings.reduce((sum, booking) => sum + booking.price_paid, 0);
      const averageValue = totalRevenue / bookings.length || 0;

      setTotalRevenue(totalRevenue);
      setTotalBookings(bookings.length);
      setAverageBookingValue(averageValue);
    } else {
      setTotalRevenue(0);
      setTotalBookings(0);
      setAverageBookingValue(0);
    }
  }, [bookings]);

  return (
    <Shell>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
            <CardDescription>All time revenue across all locations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Bookings</CardTitle>
            <CardDescription>Total bookings across all locations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average Booking Value</CardTitle>
            <CardDescription>Average value of all bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(averageBookingValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Locations</CardTitle>
            <CardDescription>Active locations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locationData?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Revenue this month</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[350px]">
              {isLoadingRevenueData ? (
                <div>Loading revenue data...</div>
              ) : revenueDataError ? (
                <div>{revenueDataError}</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={revenueData}
                    margin={{
                      top: 10,
                      right: 30,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stroke="#8884d8" fill="#8884d8" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Top Team Members</CardTitle>
            <CardDescription>Team members with the most bookings</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTopTeamMembers ? (
              <div>Loading top team members...</div>
            ) : topTeamMembersError ? (
              <div>{topTeamMembersError}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Name</TableHead>
                    <TableHead>Bookings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topTeamMembers.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={(date) =>
              date > new Date() || date < new Date("2023-01-01")
            }
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </Shell>
  );
};

export default Dashboard;
