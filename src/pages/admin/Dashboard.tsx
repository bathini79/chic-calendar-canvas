import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, subDays } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  Users,
  PackageCheck,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";

export default function Dashboard() {
  const [recentSales, setRecentSales] = useState([]);
  const [customers, setCustomers] = useState(0);
  const [packages, setPackages] = useState(0);
  const [selectedLocationId, setSelectedLocationId] = useState("");

  // Stats
  const [salesSummary, setSalesSummary] = useState({
    todaySales: 0,
    weekSales: 0,
    monthSales: 0,
    yearSales: 0,
  });
  
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
    if (!selectedLocationId && locations.length > 0) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  const fetchCustomers = async () => {
    try {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      setCustomers(count || 0);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchPackages = async () => {
    try {
      const { count, error } = await supabase
        .from("packages")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      setPackages(count || 0);
    } catch (error) {
      console.error("Error fetching packages:", error);
    }
  };
  
  // Fetch sales data for dashboard
  const fetchSalesSummary = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      
      // Fetch appointment sales
      const { data: appointmentSales, error: appointmentError } = await supabase
        .from('appointments')
        .select('total_price, created_at, transaction_type')
        .eq('transaction_type', 'sale')
        .gte('created_at', startOfYear.toISOString());
        
      if (appointmentError) throw appointmentError;
      
      // Fetch membership sales
      const { data: membershipSales, error: membershipError } = await supabase
        .from('membership_sales')
        .select('total_amount, created_at')
        .eq('status', 'completed')
        .gte('created_at', startOfYear.toISOString());
        
      if (membershipError) throw membershipError;
      
      // Calculate combined sales
      let todaySales = 0;
      let weekSales = 0;
      let monthSales = 0;
      let yearSales = 0;
      
      // Process appointment sales
      appointmentSales.forEach((sale) => {
        const saleDate = new Date(sale.created_at);
        const amount = parseFloat(sale.total_price);
        
        yearSales += amount;
        
        if (saleDate >= startOfMonth) {
          monthSales += amount;
        }
        
        if (saleDate >= startOfWeek) {
          weekSales += amount;
        }
        
        if (saleDate.setHours(0, 0, 0, 0) === today.getTime()) {
          todaySales += amount;
        }
      });
      
      // Process membership sales
      membershipSales.forEach((sale) => {
        const saleDate = new Date(sale.created_at);
        const amount = parseFloat(sale.total_amount);
        
        yearSales += amount;
        
        if (saleDate >= startOfMonth) {
          monthSales += amount;
        }
        
        if (saleDate >= startOfWeek) {
          weekSales += amount;
        }
        
        if (saleDate.setHours(0, 0, 0, 0) === today.getTime()) {
          todaySales += amount;
        }
      });
      
      setSalesSummary({
        todaySales,
        weekSales,
        monthSales,
        yearSales,
      });
    } catch (error) {
      console.error("Error fetching sales summary:", error);
    }
  };
  
  // Fetch recent sales including memberships
  const fetchRecentSales = async () => {
    try {
      // Fetch appointment sales
      const { data: appointmentSales, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          id,
          customer_id,
          total_price,
          created_at,
          transaction_type,
          payment_method,
          status,
          customer:profiles(full_name, email)
        `)
        .eq('transaction_type', 'sale')
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (appointmentError) throw appointmentError;
      
      // Fetch membership sales
      const { data: membershipSales, error: membershipError } = await supabase
        .from('membership_sales')
        .select(`
          id,
          customer_id,
          membership_id,
          total_amount,
          payment_method,
          created_at,
          status,
          customer:profiles(full_name, email),
          membership:memberships(name)
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (membershipError) throw membershipError;
      
      // Format appointment sales for display
      const formattedAppointmentSales = appointmentSales.map(sale => ({
        id: sale.id,
        customer: sale.customer,
        amount: sale.total_price,
        date: sale.created_at,
        paymentMethod: sale.payment_method,
        type: 'Service',
        status: sale.status
      }));
      
      // Format membership sales for display
      const formattedMembershipSales = membershipSales.map(sale => ({
        id: sale.id,
        customer: sale.customer,
        amount: sale.total_amount,
        date: sale.created_at,
        paymentMethod: sale.payment_method,
        type: 'Membership: ' + (sale.membership?.name || 'Unknown'),
        status: sale.status
      }));
      
      // Combine and sort sales by date
      const combinedSales = [...formattedAppointmentSales, ...formattedMembershipSales]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);
      
      setRecentSales(combinedSales);
    } catch (error) {
      console.error("Error fetching recent sales:", error);
    }
  };

  useEffect(() => {
    if (supabase) {
      fetchSalesSummary();
      fetchRecentSales();
      fetchCustomers();
      fetchPackages();
    }
  }, [selectedLocationId]);

  const data = [
    {
      title: "Total Sales",
      metric: `$${salesSummary.yearSales.toFixed(2)}`,
      previous: "$250.00",
      change: "1.6%",
      date: "Yearly",
      icon: TrendingUp,
      iconColor: "text-sky-500",
    },
    {
      title: "New Customers",
      metric: `${customers}`,
      previous: "2,356",
      change: "2.01%",
      date: "Yearly",
      icon: Users,
      iconColor: "text-orange-500",
    },
    {
      title: "Total Packages",
      metric: `${packages}`,
      previous: "2,356",
      change: "1.39%",
      date: "Yearly",
      icon: PackageCheck,
      iconColor: "text-violet-500",
    },
  ];

  return (
    <div className="hidden h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Here is an overview of your business today.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <Select 
            value={selectedLocationId} 
            onValueChange={setSelectedLocationId}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map(location => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
        {data.map((item) => (
          <Card key={item.title}>
            <CardHeader className="flex items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <item.icon className={item.iconColor + " h-4 w-4"} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.metric}</div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <ArrowUp className="h-4 w-4" />
                <span>{item.change}</span>
                <span className="text-xs">
                  {item.date === "Today"
                    ? "Since yesterday"
                    : `Since last ${item.date.toLocaleLowerCase()}`}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">
                      {sale.customer?.full_name || "N/A"}
                    </TableCell>
                    <TableCell>${sale.amount}</TableCell>
                    <TableCell>{sale.paymentMethod}</TableCell>
                    <TableCell>{sale.type}</TableCell>
                    <TableCell className="text-right">{sale.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
