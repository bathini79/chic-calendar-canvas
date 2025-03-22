
import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarRange,
  ShoppingBag,
  Users,
  DollarSign,
  Bookmark,
  TrendingUp,
  FileSpreadsheet,
} from "lucide-react";
import { RecentAppointments } from "@/components/admin/dashboard/RecentAppointments";
import { BarChartComponent } from "@/components/admin/dashboard/BarChart";
import { LocationRevenueTable } from "@/components/admin/dashboard/LocationRevenueTable";
import { format } from "date-fns";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const [currentTab, setCurrentTab] = useState("overview");
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  // Revenue data
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["revenue", dateRange.from, dateRange.to],
    queryFn: async () => {
      // Fetch appointment revenue
      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .select("total_price, created_at")
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString())
        .eq("transaction_type", "sale");

      if (appointmentError) throw appointmentError;

      // Fetch membership sales revenue
      const { data: membershipData, error: membershipError } = await supabase
        .from("membership_sales")
        .select("total_amount, created_at")
        .gte("sale_date", dateRange.from.toISOString())
        .lte("sale_date", dateRange.to.toISOString())
        .eq("status", "completed");

      if (membershipError) throw membershipError;

      // Calculate total revenue
      const appointmentRevenue = appointmentData?.reduce(
        (sum, item) => sum + (item.total_price || 0),
        0
      ) || 0;

      const membershipRevenue = membershipData?.reduce(
        (sum, item) => sum + (item.total_amount || 0),
        0
      ) || 0;

      const totalRevenue = appointmentRevenue + membershipRevenue;

      return {
        appointmentRevenue,
        membershipRevenue,
        totalRevenue,
      };
    },
  });

  // Bookings data
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings", dateRange.from, dateRange.to],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString());

      if (error) throw error;
      return count || 0;
    },
  });

  // Memberships sold
  const { data: membershipsSold, isLoading: membershipsSoldLoading } = useQuery({
    queryKey: ["memberships-sold", dateRange.from, dateRange.to],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("membership_sales")
        .select("id", { count: "exact", head: true })
        .gte("sale_date", dateRange.from.toISOString())
        .lte("sale_date", dateRange.to.toISOString())
        .eq("status", "completed");

      if (error) throw error;
      return count || 0;
    },
  });

  // Recent sales data (appointments and memberships)
  const { data: recentSales, isLoading: recentSalesLoading } = useQuery({
    queryKey: ["recent-sales", dateRange.from, dateRange.to],
    queryFn: async () => {
      // Get appointments
      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .select(`
          id, total_price, created_at, customer_id,
          customer:profiles(full_name, email)
        `)
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      if (appointmentError) throw appointmentError;

      // Get membership sales
      const { data: membershipData, error: membershipError } = await supabase
        .from("membership_sales")
        .select(`
          id, total_amount, sale_date, customer_id,
          customer:profiles(full_name, email),
          membership:memberships(name)
        `)
        .gte("sale_date", dateRange.from.toISOString())
        .lte("sale_date", dateRange.to.toISOString())
        .order("sale_date", { ascending: false })
        .limit(10);
        
      if (membershipError) throw membershipError;

      // Transform membership data to match appointment format
      const transformedMembershipData = membershipData?.map(membership => ({
        id: membership.id,
        total_price: membership.total_amount,
        created_at: membership.sale_date,
        customer_id: membership.customer_id,
        customer: membership.customer,
        type: 'membership',
        membership_name: membership.membership?.name
      }));

      // Combine and sort by date
      const combined = [
        ...(appointmentData?.map(appointment => ({ ...appointment, type: 'appointment' })) || []),
        ...(transformedMembershipData || [])
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

      return combined;
    },
  });

  // Customers data
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "customer");

      if (error) throw error;
      return count || 0;
    },
  });

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <DateRangePicker
            initialDateFrom={dateRange.from}
            initialDateTo={dateRange.to}
            onUpdate={({ from, to }) => {
              if (from && to) {
                setDateRange({ from, to });
              }
            }}
          />
        </div>
      </div>
      <Tabs
        defaultValue="overview"
        value={currentTab}
        onValueChange={setCurrentTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center">
            <TrendingUp className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {revenueLoading ? "Loading..." : `₹${revenueData?.totalRevenue.toFixed(2)}`}
                </div>
                <p className="text-xs text-muted-foreground">
                  From {format(dateRange.from, "MMM d, yyyy")} to{" "}
                  {format(dateRange.to, "MMM d, yyyy")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bookings</CardTitle>
                <CalendarRange className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {bookingsLoading ? "Loading..." : bookingsData}
                </div>
                <p className="text-xs text-muted-foreground">
                  From {format(dateRange.from, "MMM d, yyyy")} to{" "}
                  {format(dateRange.to, "MMM d, yyyy")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Memberships Sold
                </CardTitle>
                <Bookmark className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {membershipsSoldLoading ? "Loading..." : membershipsSold}
                </div>
                <p className="text-xs text-muted-foreground">
                  From {format(dateRange.from, "MMM d, yyyy")} to{" "}
                  {format(dateRange.to, "MMM d, yyyy")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Customers
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {customersLoading ? "Loading..." : customersData}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <BarChartComponent />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
              </CardHeader>
              <CardContent>
                {recentSalesLoading ? (
                  <div>Loading...</div>
                ) : (
                  <div className="space-y-8">
                    {recentSales?.map((sale) => (
                      <div
                        key={`${sale.type}-${sale.id}`}
                        className="flex items-center"
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center">
                            {sale.type === 'membership' ? (
                              <Bookmark className="h-5 w-5 text-primary" />
                            ) : (
                              <ShoppingBag className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">
                              {sale.customer?.full_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {sale.customer?.email}
                            </p>
                            {sale.type === 'membership' && (
                              <p className="text-xs text-primary-foreground bg-primary/10 px-2 py-0.5 rounded-full inline-block">
                                {sale.membership_name} Membership
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="ml-auto font-medium">₹{sale.total_price}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="space-y-4">
          <Card className="col-span-7">
            <CardHeader>
              <CardTitle>Revenue by Location</CardTitle>
            </CardHeader>
            <CardContent>
              <LocationRevenueTable dateRange={dateRange} />
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                <RecentAppointments />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
