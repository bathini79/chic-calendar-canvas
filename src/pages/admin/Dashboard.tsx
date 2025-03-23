import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { format as formatTimeAgo } from "timeago.js";
import { User, CircleUser, CalendarDays, TrendingUp, DollarSign, Users, ArrowUpRight, Calendar, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminLayout from "@/layouts/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentSales, RecentSale } from "@/hooks/use-recent-sales";

const Dashboard = () => {
  const [dailyStats, setDailyStats] = useState({
    appointmentsCount: 0,
    totalRevenue: 0,
    newCustomers: 0,
    salesCount: 0,
  });
  const [staffStats, setStaffStats] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Use the recentSales hook
  const { sales: recentSales, isLoading: salesLoading } = useRecentSales(30, 5);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);

      try {
        // Fetch today's appointments count
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISOString = today.toISOString();

        const { count: appointmentsCount, error: appointmentsError } = await supabase
          .from("appointments")
          .select("*", { count: "exact" })
          .gte("created_at", todayISOString);

        if (appointmentsError) throw appointmentsError;

        // Fetch today's revenue
        const { data: revenueData, error: revenueError } = await supabase
          .from("appointments")
          .select("total_price")
          .gte("created_at", todayISOString);

        if (revenueError) throw revenueError;

        const totalRevenue = revenueData?.reduce((sum, appointment) => sum + (appointment.total_price || 0), 0) || 0;

        // Fetch new customers count
        const { count: newCustomersCount, error: customersError } = await supabase
          .from("profiles")
          .select("*", { count: "exact" })
          .eq("role", "customer")
          .gte("created_at", todayISOString);

        if (customersError) throw customersError;

        // Fetch today's sales count (appointments + membership sales)
        const { count: membershipSalesCount, error: membershipError } = await supabase
          .from("membership_sales")
          .select("*", { count: "exact" })
          .gte("sale_date", todayISOString);

        if (membershipError) throw membershipError;

        const totalSalesCount = (appointmentsCount || 0) + (membershipSalesCount || 0);

        setDailyStats({
          appointmentsCount: appointmentsCount || 0,
          totalRevenue,
          newCustomers: newCustomersCount || 0,
          salesCount: totalSalesCount,
        });

        // Fetch upcoming appointments
        const { data: upcomingData, error: upcomingError } = await supabase
          .from("appointments")
          .select(`
            id, 
            start_time, 
            customer_id, 
            customer:profiles(full_name),
            bookings(
              service:services(name)
            )
          `)
          .gt("start_time", new Date().toISOString())
          .order("start_time")
          .limit(5);

        if (upcomingError) throw upcomingError;

        setUpcomingAppointments(upcomingData || []);

        // Fetch top services
        const { data: topServicesData, error: topServicesError } = await supabase
          .rpc("get_top_services_this_month")
          .limit(5);

        if (topServicesError) {
          console.error("Error fetching top services:", topServicesError);
          // Fallback: just get some services
          const { data: services, error: servicesError } = await supabase
            .from("services")
            .select("id, name, selling_price")
            .limit(5);

          if (servicesError) throw servicesError;
          setTopServices(services || []);
        } else {
          setTopServices(topServicesData || []);
        }

        // Fetch staff stats
        const { data: staffData, error: staffError } = await supabase
          .from("employees")
          .select("id, name, employment_type, status");

        if (staffError) throw staffError;
        setStaffStats(staffData || []);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Function to render recent sale item based on type
  const renderRecentSaleItem = (sale: RecentSale) => {
    const customerName = sale.customer.full_name;
    const amount = sale.type === 'appointment' ? sale.total_price : sale.total_amount;
    const date = sale.type === 'appointment' ? sale.created_at : sale.sale_date;
    const formattedDate = formatTimeAgo(date);
    const saleType = sale.type === 'appointment' ? 'Appointment' : 
      (sale.type === 'membership' && sale.membership ? sale.membership.name : 'Membership');

    return (
      <div key={sale.id} className="flex items-center gap-4 mb-4">
        <div className="bg-primary/10 p-2 rounded-full text-primary">
          {sale.type === 'appointment' ? <Calendar size={20} /> : <BadgeCheck size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{customerName}</p>
          <p className="text-xs text-muted-foreground">
            {saleType} • {formattedDate}
          </p>
        </div>
        <div className="text-sm font-medium">{formatPrice(amount)}</div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button variant="outline">
            {format(new Date(), "MMMM d, yyyy")}
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Daily Stats cards - keep existing code */}
          <StatCard
            icon={<Calendar className="h-6 w-6 text-blue-600" />}
            title="Appointments"
            value={dailyStats.appointmentsCount}
            loading={loading}
            trend={7}
            trendLabel="from yesterday"
          />
          <StatCard
            icon={<DollarSign className="h-6 w-6 text-green-600" />}
            title="Revenue"
            value={formatPrice(dailyStats.totalRevenue)}
            loading={loading}
            trend={12}
            trendLabel="from yesterday"
          />
          <StatCard
            icon={<Users className="h-6 w-6 text-orange-600" />}
            title="New Customers"
            value={dailyStats.newCustomers}
            loading={loading}
            trend={-3}
            trendLabel="from yesterday"
          />
          <StatCard
            icon={<TrendingUp className="h-6 w-6 text-purple-600" />}
            title="Total Sales"
            value={dailyStats.salesCount}
            loading={loading}
            trend={5}
            trendLabel="from yesterday"
          />
        </div>

        {/* Secondary Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Recent Sales */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recent Sales</CardTitle>
            </CardHeader>
            <CardContent>
              {salesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-4/5" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : recentSales.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No recent sales</p>
              ) : (
                recentSales.map(renderRecentSaleItem)
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="ghost" size="sm" className="w-full">
                View all sales
              </Button>
            </CardFooter>
          </Card>

          {/* Top Services and Staff Stats cards - keep existing code */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Top Services</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : topServices.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No services data</p>
              ) : (
                <div className="space-y-4">
                  {topServices.map((service: any) => (
                    <div key={service.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {service.count || 0} bookings
                        </p>
                      </div>
                      <div className="font-medium">
                        {formatPrice(service.selling_price || service.total_revenue || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="ghost" size="sm" className="w-full">
                View all services
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Staff Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-4/5" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              ) : staffStats.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No staff data</p>
              ) : (
                <div className="space-y-4">
                  {staffStats.map((staff: any) => (
                    <div key={staff.id} className="flex items-center gap-4">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <CircleUser className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{staff.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {staff.employment_type || "Employee"}
                        </p>
                      </div>
                      <div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          staff.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}>
                          {staff.status || "Active"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="ghost" size="sm" className="w-full">
                View all staff
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-md" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No upcoming appointments</p>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment: any) => {
                  const startTime = new Date(appointment.start_time);
                  const serviceName = appointment.bookings?.[0]?.service?.name || "Service";
                  
                  return (
                    <div key={appointment.id} className="flex items-center gap-4">
                      <div className="bg-primary/10 p-3 rounded-md text-primary">
                        <CalendarDays className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{appointment.customer?.full_name || "Customer"}</p>
                        <p className="text-sm text-muted-foreground">
                          {serviceName} • {format(startTime, "MMM d, h:mm a")}
                        </p>
                      </div>
                      <Button size="sm" variant="outline">View</Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="ghost" size="sm" className="w-full">
              View all appointments
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AdminLayout>
  );
};

// StatCard Component
const StatCard = ({ icon, title, value, loading, trend, trendLabel }) => {
  return (
    <Card>
      <CardContent className="p-6">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              {icon}
              <span className="font-medium text-sm">{title}</span>
            </div>
            <div className="text-3xl font-bold">{value}</div>
            <div className="flex items-center mt-2 text-xs">
              <span className={`flex items-center ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
                <ArrowUpRight className={`h-3 w-3 ${trend < 0 ? "rotate-180" : ""}`} />
                {Math.abs(trend)}%
              </span>
              <span className="text-muted-foreground ml-1">{trendLabel}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default Dashboard;
