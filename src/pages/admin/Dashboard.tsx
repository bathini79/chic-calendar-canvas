
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const [locations, setLocations] = useState<any[]>([]);
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [period, setPeriod] = React.useState<"today" | "week" | "month">(
    "today"
  );

  const periodStart = new Date(date);
  let periodEnd = new Date(date);

  if (period === "week") {
    const dayOfWeek = periodStart.getDay();
    const diff = periodStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    periodStart.setDate(diff);
    periodEnd.setDate(diff + 6);
  } else if (period === "month") {
    periodStart.setDate(1);
    periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);
  }

  const { data: totalRevenue = [] } = useQuery({
    queryKey: ["total-revenue", periodStart, periodEnd],
    queryFn: async () => {
      const today = format(periodStart, 'yyyy-MM-dd');
      const end = format(periodEnd, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from("appointments")
        .select("total_price")
        .gte('created_at', today)
        .lte('created_at', end);

      if (error) throw error;

      const total = data.reduce((acc, appointment) => {
        return acc + Number(appointment.total_price);
      }, 0);

      return total;
    },
  });

  const { data: newCustomers = [] } = useQuery({
    queryKey: ["new-customers", periodStart, periodEnd],
    queryFn: async () => {
      const today = format(periodStart, 'yyyy-MM-dd');
      const end = format(periodEnd, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq('role', 'customer')
        .gte('created_at', today)
        .lte('created_at', end);

      if (error) throw error;

      return data.length;
    },
  });

  const { data: employeeRevenue = [] } = useQuery({
    queryKey: ['employee-revenue', periodStart, periodEnd],
    queryFn: async () => {
      const today = format(periodStart, 'yyyy-MM-dd');
      const end = format(periodEnd, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          employee_id,
          price_paid
        `)
        .gte('created_at', today)
        .lte('created_at', end);

      if (error) throw error;

      const employeeData = data.reduce((acc: Record<string, number>, booking: any) => {
        if (booking.employee_id) {
          acc[booking.employee_id] = (acc[booking.employee_id] || 0) + Number(booking.price_paid);
        }
        return acc;
      }, {});

      const result = Object.entries(employeeData).map(([id, total]) => ({
        employee_id: id,
        total: total
      }));

      return result;
    },
  });

  useEffect(() => {
    async function fetchLocations() {
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .eq('is_active', true);
          
        if (error) throw error;
        setLocations(data || []);
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    }
    
    fetchLocations();
  }, []);

  return (
    <div className="container space-y-6 py-10">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Here&apos;s an overview of your business
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? (
                  format(date, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
                <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPeriod("today")}
            className={cn({
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground":
                period === "today",
            })}
          >
            Today
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPeriod("week")}
            className={cn({
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground":
                period === "week",
            })}
          >
            Week
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPeriod("month")}
            className={cn({
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground":
                period === "month",
            })}
          >
            Month
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalRevenue}</div>
            <p className="text-sm text-muted-foreground">
              {format(periodStart, "MMM dd")} - {format(periodEnd, "MMM dd")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Customers</CardTitle>
            <UserRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newCustomers}</div>
            <p className="text-sm text-muted-foreground">
              {format(periodStart, "MMM dd")} - {format(periodEnd, "MMM dd")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Revenue by Employee
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employeeRevenue.length} Employees
            </div>
            <p className="text-sm text-muted-foreground">
              {format(periodStart, "MMM dd")} - {format(periodEnd, "MMM dd")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface CalendarIconProps extends React.SVGAttributes<SVGElement> {}

function CalendarIcon(props: CalendarIconProps) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}
