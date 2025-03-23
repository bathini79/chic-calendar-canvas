import React, { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { startOfMonth, endOfMonth, format, subMonths, addMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar as CalendarIcon, ListChecks, User2, Store, PieChart } from "lucide-react";
import { Overview } from "@/components/admin/dashboard/Overview";
import { FinancialDashboard } from "@/components/admin/dashboard/FinancialDashboard";
import { RecentSales } from "@/components/admin/dashboard/RecentSales";
import { TopSellingProducts } from "@/components/admin/dashboard/TopSellingProducts";
import { TopCustomers } from "@/components/admin/dashboard/TopCustomers";
import { TopEmployees } from "@/components/admin/dashboard/TopEmployees";
import { useToast } from "@/components/ui/use-toast";
import { useUser } from "@/hooks/use-user";
import { useRouter } from "next/router";
import { MetricCard } from "@/components/admin/dashboard/MetricCard";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { addDays } from "date-fns";
import { RevenueChart } from "@/components/admin/reports/RevenueChart";
import { ServiceRevenueChart } from "@/components/admin/reports/ServiceRevenueChart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocationTaxSettings } from "@/hooks/use-location-tax-settings";
import { useTaxRates } from "@/hooks/use-tax-rates";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, ShoppingCart, Calendar as CalendarIconLucide } from "lucide-react";
import { Appointment } from "./bookings/types";
import { MembershipSale } from "@/components/admin/sales/MembershipSale";

interface DashboardProps {
  className?: string;
}

interface BusinessMetrics {
  employees: number;
  services: number;
  locations: number;
}

export default function Dashboard({ className }: DashboardProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const router = useRouter();

  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics>({
    employees: 0,
    services: 0,
    locations: 0
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddSaleOpen, setIsAddSaleOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  const [date, setDate] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });
  const [revenueData, setRevenueData] = useState<{ date: string; revenue: number }[]>([]);
  const [serviceRevenueData, setServiceRevenueData] = useState<{ service: string; revenue: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { fetchLocationTaxSettings } = useLocationTaxSettings();
  const { fetchTaxRates } = useTaxRates();

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  useEffect(() => {
    if (!selectedLocationId && locations.length > 0) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  useEffect(() => {
    fetchBusinessMetrics();
    fetchRevenueData();
    fetchServiceRevenueData();
  }, [selectedLocationId]);

  const fetchRevenueData = async () => {
    setIsLoading(true);
    try {
      if (!date?.from || !date?.to) return;

      const fromDate = format(date.from, 'yyyy-MM-dd');
      const toDate = format(date.to, 'yyyy-MM-dd');

      let query = supabase
        .from('appointments')
        .select(`
          created_at,
          total_price
        `)
        .gte('created_at', fromDate)
        .lte('created_at', toDate)
        .eq('status', 'completed');

      if (selectedLocationId !== "all") {
        query = query.eq('location', selectedLocationId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const dailyRevenue: { [date: string]: number } = {};
      data?.forEach(item => {
        const date = format(new Date(item.created_at), 'yyyy-MM-dd');
        dailyRevenue[date] = (dailyRevenue[date] || 0) + (item.total_price || 0);
      });

      const revenueData = Object.entries(dailyRevenue).map(([date, revenue]) => ({
        date,
        revenue
      }));

      setRevenueData(revenueData);
    } catch (error) {
      console.error("Error fetching revenue data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch revenue data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchServiceRevenueData = async () => {
    setIsLoading(true);
    try {
      if (!date?.from || !date?.to) return;

      const fromDate = format(date.from, 'yyyy-MM-dd');
      const toDate = format(date.to, 'yyyy-MM-dd');

      let query = supabase
        .from('appointments')
        .select(`
          bookings (
            service:services (
              name
            ),
            price_paid
          )
        `)
        .gte('created_at', fromDate)
        .lte('created_at', toDate)
        .eq('status', 'completed');

      if (selectedLocationId !== "all") {
        query = query.eq('location', selectedLocationId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const serviceRevenue: { [service: string]: number } = {};
      data?.forEach(item => {
        item.bookings?.forEach(booking => {
          if (booking.service?.name) {
            serviceRevenue[booking.service.name] = (serviceRevenue[booking.service.name] || 0) + (booking.price_paid || 0);
          }
        });
      });

      const serviceRevenueData = Object.entries(serviceRevenue).map(([service, revenue]) => ({
        service,
        revenue
      }));

      setServiceRevenueData(serviceRevenueData);
    } catch (error) {
      console.error("Error fetching service revenue data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch service revenue data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (locationId: string) => {
    setSelectedLocationId(locationId);
  };

  const fetchBusinessMetrics = async () => {
    try {
      // Get total number of employees (stylists)
      const { data: stylists, error: stylistsError } = await supabase
        .from("employees")
        .select("id")
        .eq("employment_type", "stylist")
        .eq("status", "active");

      if (stylistsError) throw stylistsError;

      // Get total number of services
      const { data: services, error: servicesError } = await supabase
        .from("services")
        .select("id")
        .eq("status", "active");

      if (servicesError) throw servicesError;

      // Get total number of active locations
      const { data: locations, error: locationsError } = await supabase
        .from("locations")
        .select("id")
        .eq("is_active", true);

      if (locationsError) throw locationsError;

      // Total up the counts
      const employeeCount = stylists ? stylists.length : 0;
      const serviceCount = services ? services.length : 0;
      const locationCount = locations ? locations.length : 0;

      setBusinessMetrics({
        employees: employeeCount,
        services: serviceCount,
        locations: locationCount
      });
    } catch (error) {
      console.error("Error fetching business metrics:", error);
    }
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const openAddAppointmentFromButton = () => {
    router.push('/admin/bookings');
  };

  return (
    <div className={cn("hidden flex-col md:flex", className)}>
      <div className="border-b">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={openAddAppointmentFromButton}>
                  <CalendarIconLucide className="mr-2 h-4 w-4" />
                  <span>Add Appointment</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsAddSaleOpen(true)}>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  <span>Add Sale</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <Select 
                value={selectedLocationId} 
                onValueChange={handleFilterChange}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(location => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-4 py-4">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <MetricCard
            title="Total Employees"
            value={businessMetrics.employees}
            icon={<User2 className="h-4 w-4" />}
            description="Number of active stylists"
          />
          <MetricCard
            title="Total Services"
            value={businessMetrics.services}
            icon={<ListChecks className="h-4 w-4" />}
            description="Number of active services"
          />
          <MetricCard
            title="Total Locations"
            value={businessMetrics.locations}
            icon={<Store className="h-4 w-4" />}
            description="Number of active locations"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Revenue</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <RevenueChart data={revenueData} isLoading={isLoading} />
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Service Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <ServiceRevenueChart data={serviceRevenueData} isLoading={isLoading} />
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <RecentSales locationId={selectedLocationId} />
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
            </CardHeader>
            <CardContent>
              <TopSellingProducts locationId={selectedLocationId} />
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <TopCustomers locationId={selectedLocationId} />
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Top Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <TopEmployees locationId={selectedLocationId} />
            </CardContent>
          </Card>
        </div>
      </div>

      <MembershipSale
        isOpen={isAddSaleOpen}
        onClose={() => setIsAddSaleOpen(false)}
        locationId={selectedLocationId}
      />
    </div>
  );
}
