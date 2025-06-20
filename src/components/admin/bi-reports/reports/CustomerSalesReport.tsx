import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, Star, TrendingUp, Crown, DollarSign, UserCheck, Award } from 'lucide-react';
import { ReportDataTable } from '../components/ReportDataTable';
import { ReportFilters, ReportFilterConfig } from '../components/ReportFilters';

interface CustomerTransaction {
  id: string;
  date: string;
  customer: string;
  email: string;
  phone: string;
  service: string;
  amount: number;
  tier: string;
}

interface CustomerAnalysis {
  id: string;
  customer: string;
  email: string;
  phone: string;
  tier: string;
  totalBookings: number;
  totalSpent: number;
  averageSpending: number;
  lastVisit: string;
  firstVisit: string;
}

interface TierAnalysis {
  tier: string;
  customers: number;
  percentage: number;
  totalRevenue: number;
  averageSpent: number;
  averageBookings: number;
}

interface CustomerSummary {
  totalCustomers: number;
  totalRevenue: number;
  averageCustomerValue: number;
  averageBookingsPerCustomer: number;
  topCustomerName: string;
  topCustomerSpent: number;
}

interface CustomerFilters {
  dateRange: [Date | null, Date | null];
  tier: string[];
  spendingRange: [number, number];
  customer: string;
  bookingsRange: [number, number];
  lastVisitDays: string;
}

export function CustomerSalesReport() {
  const [filters, setFilters] = useState<CustomerFilters>({
    dateRange: [subDays(new Date(), 30), new Date()],
    tier: [],
    spendingRange: [0, 50000],
    customer: '',
    bookingsRange: [0, 100],
    lastVisitDays: '90'
  });

  // Fetch customer sales data
  const { data: customerData, isLoading } = useQuery({
    queryKey: ['customer-sales-report', filters],
    queryFn: async () => {
      const [startDate, endDate] = filters.dateRange;
        // Get customer data via appointments with proper joins
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          total_price,
          start_time,
          status,
          customer_id,
          profiles!appointments_customer_id_fkey (
            id,
            full_name,
            user_id,
            phone_number
          ),
          bookings (
            id,
            price_paid,
            start_time,
            services:service_id (
              name
            )
          )
        `)
        .gte('start_time', startDate?.toISOString())
        .lte('start_time', endDate?.toISOString())
        .eq('status', 'completed')
        .order('start_time', { ascending: false });
        
      if (error) throw error;
      
      const customerMap = new Map<string, CustomerAnalysis>();
      const transactions: CustomerTransaction[] = [];
      let totalRevenue = 0;
      let totalBookings = 0;

      appointments?.forEach(appointment => {
        if (!appointment.profiles) return;

        const customer = appointment.profiles;
        const customerId = customer.id;
        const customerName = customer.full_name || 'Unknown';
        const amount = appointment.total_price || 0;
        
        totalRevenue += amount;
        totalBookings += 1;

        // Add to transactions
        appointment.bookings?.forEach(booking => {
          transactions.push({
            id: booking.id,
            date: format(new Date(appointment.start_time), 'MMM dd, yyyy'),
            customer: customerName,
            email: 'N/A', // Email not directly available in profiles
            phone: customer.phone_number || 'N/A',
            service: booking.services?.name || 'N/A',
            amount: booking.price_paid || 0,
            tier: 'Bronze' // Will be calculated below
          });
        });

        // Update customer summary
        const existing = customerMap.get(customerId);
        if (existing) {
          existing.totalSpent += amount;
          existing.totalBookings += 1;
          existing.averageSpending = existing.totalSpent / existing.totalBookings;
          
          const currentDate = new Date(appointment.start_time);
          const existingLastVisit = new Date(existing.lastVisit);
          
          if (currentDate > existingLastVisit) {
            existing.lastVisit = format(currentDate, 'MMM dd, yyyy');
          }
          
          const existingFirstVisit = new Date(existing.firstVisit);
          if (currentDate < existingFirstVisit) {
            existing.firstVisit = format(currentDate, 'MMM dd, yyyy');
          }
        } else {
          customerMap.set(customerId, {
            id: customerId,
            customer: customerName,
            email: 'N/A',
            phone: customer.phone_number || 'N/A',
            tier: 'Bronze',
            totalBookings: 1,
            totalSpent: amount,
            averageSpending: amount,
            lastVisit: format(new Date(appointment.start_time), 'MMM dd, yyyy'),
            firstVisit: format(new Date(appointment.start_time), 'MMM dd, yyyy')
          });
        }
      });

      // Calculate customer tiers
      const customers = Array.from(customerMap.values()).map(customer => {
        let tier = 'Bronze';
        if (customer.totalSpent >= 50000) tier = 'Platinum';
        else if (customer.totalSpent >= 25000) tier = 'Gold';
        else if (customer.totalSpent >= 10000) tier = 'Silver';
        
        return { ...customer, tier };
      }).sort((a, b) => b.totalSpent - a.totalSpent);

      // Update transaction tiers
      const updatedTransactions = transactions.map(transaction => {
        const customer = customers.find(c => c.customer === transaction.customer);
        return { ...transaction, tier: customer?.tier || 'Bronze' };
      });

      // Calculate tier segments
      const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
      const segments = tiers.map(tier => {
        const tierCustomers = customers.filter(c => c.tier === tier);
        const tierRevenue = tierCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
        
        return {
          tier,
          customers: tierCustomers.length,
          revenue: tierRevenue,
          percentage: customers.length > 0 ? (tierCustomers.length / customers.length) * 100 : 0,
          averageSpent: tierCustomers.length > 0 ? tierRevenue / tierCustomers.length : 0,
          averageBookings: tierCustomers.length > 0 
            ? tierCustomers.reduce((sum, c) => sum + c.totalBookings, 0) / tierCustomers.length 
            : 0
        };
      });
      
      const summary: CustomerSummary = {
        totalCustomers: customers.length,
        totalRevenue,
        averageCustomerValue: customers.length > 0 ? totalRevenue / customers.length : 0,
        averageBookingsPerCustomer: customers.length > 0 
          ? customers.reduce((sum, c) => sum + c.totalBookings, 0) / customers.length 
          : 0,
        topCustomerName: customers[0]?.customer || 'N/A',
        topCustomerSpent: customers[0]?.totalSpent || 0
      };
      
      return {
        transactions: updatedTransactions,
        customers: customers.slice(0, 50), // Top 50 customers
        segments,
        summary
      };
    }
  });

  // Filter configurations
  const filterConfigs: ReportFilterConfig[] = [
    {
      key: 'dateRange',
      label: 'Date Range',
      type: 'dateRange'
    },
    {
      key: 'tier',
      label: 'Customer Tier',
      type: 'multiSelect',
      options: [
        { label: 'Bronze', value: 'Bronze' },
        { label: 'Silver', value: 'Silver' },
        { label: 'Gold', value: 'Gold' },
        { label: 'Platinum', value: 'Platinum' }
      ]
    },
    {
      key: 'spendingRange',
      label: 'Spending Range (₹)',
      type: 'number'
    },
    {
      key: 'bookingsRange',
      label: 'Bookings Count',
      type: 'number'
    },
    {
      key: 'customer',
      label: 'Customer',
      type: 'text',
      placeholder: 'Search by customer name...'
    },
    {
      key: 'lastVisitDays',
      label: 'Last Visit (Days Ago)',
      type: 'select',
      options: [
        { label: 'Last 7 days', value: '7' },
        { label: 'Last 30 days', value: '30' },
        { label: 'Last 90 days', value: '90' },
        { label: 'Last 6 months', value: '180' },
        { label: 'Last year', value: '365' }
      ]
    }
  ];

  // Apply filters to data
  const filteredTransactions = useMemo(() => {
    if (!customerData?.transactions) return [];
    
    return customerData.transactions.filter(transaction => {
      // Tier filter
      if (filters.tier.length > 0 && 
          !filters.tier.includes(transaction.tier)) {
        return false;
      }

      // Spending range filter
      if (transaction.amount < filters.spendingRange[0] || 
          transaction.amount > filters.spendingRange[1]) {
        return false;
      }

      // Customer filter
      if (filters.customer && 
          !transaction.customer.toLowerCase().includes(filters.customer.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [customerData?.transactions, filters]);

  const filteredCustomers = useMemo(() => {
    if (!customerData?.customers) return [];
    
    return customerData.customers.filter(customer => {
      // Tier filter
      if (filters.tier.length > 0 && 
          !filters.tier.includes(customer.tier)) {
        return false;
      }

      // Spending range filter
      if (customer.totalSpent < filters.spendingRange[0] || 
          customer.totalSpent > filters.spendingRange[1]) {
        return false;
      }

      // Bookings range filter
      if (customer.totalBookings < filters.bookingsRange[0] || 
          customer.totalBookings > filters.bookingsRange[1]) {
        return false;
      }

      // Customer filter
      if (filters.customer && 
          !customer.customer.toLowerCase().includes(filters.customer.toLowerCase())) {
        return false;
      }

      // Last visit filter
      const lastVisitDate = new Date(customer.lastVisit);
      const daysSinceLastVisit = Math.floor((new Date().getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastVisit > parseInt(filters.lastVisitDays)) {
        return false;
      }

      return true;
    });
  }, [customerData?.customers, filters]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'Platinum': return 'bg-purple-100 text-purple-800';
      case 'Gold': return 'bg-yellow-100 text-yellow-800';
      case 'Silver': return 'bg-gray-100 text-gray-800';
      default: return 'bg-orange-100 text-orange-800';
    }
  };

  const columns = [
    { 
      key: 'date', 
      label: 'Date', 
      sortable: true
    },
    { 
      key: 'customer', 
      label: 'Customer', 
      sortable: true
    },
    { 
      key: 'email', 
      label: 'Email', 
      sortable: true 
    },
    { 
      key: 'phone', 
      label: 'Phone', 
      sortable: true 
    },
    { 
      key: 'service', 
      label: 'Service', 
      sortable: true 
    },
    { 
      key: 'amount', 
      label: 'Amount', 
      sortable: true,
      type: 'currency' as const
    },
    { 
      key: 'tier', 
      label: 'Tier', 
      sortable: true
    }
  ];

  const customerColumns = [
    { 
      key: 'customer', 
      label: 'Customer', 
      sortable: true
    },
    { 
      key: 'tier', 
      label: 'Tier', 
      sortable: true
    },
    { 
      key: 'totalBookings', 
      label: 'Bookings', 
      sortable: true,
      type: 'number' as const
    },
    { 
      key: 'totalSpent', 
      label: 'Total Spent', 
      sortable: true,
      type: 'currency' as const
    },
    { 
      key: 'averageSpending', 
      label: 'Avg Spending', 
      sortable: true,
      type: 'currency' as const
    },
    { 
      key: 'lastVisit', 
      label: 'Last Visit', 
      sortable: true
    },
    { 
      key: 'firstVisit', 
      label: 'First Visit', 
      sortable: true
    }
  ];

  const tierColumns = [
    { 
      key: 'tier', 
      label: 'Tier', 
      sortable: true
    },
    { 
      key: 'customers', 
      label: 'Customers', 
      sortable: true,
      type: 'number' as const
    },
    { 
      key: 'percentage', 
      label: 'Percentage', 
      sortable: true,
      type: 'percentage' as const
    },
    { 
      key: 'revenue', 
      label: 'Total Revenue', 
      sortable: true,
      type: 'currency' as const
    },
    { 
      key: 'averageSpent', 
      label: 'Avg Spent', 
      sortable: true,
      type: 'currency' as const
    },
    { 
      key: 'averageBookings', 
      label: 'Avg Bookings', 
      sortable: true,
      type: 'number' as const
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customer Sales Report</h2>
          <p className="text-muted-foreground">
            Comprehensive customer analytics with segmentation and lifetime value tracking
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customerData?.summary.totalCustomers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(customerData?.summary.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {filteredTransactions.length} bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Customer Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(customerData?.summary.averageCustomerValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Lifetime value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Customer</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {customerData?.summary.topCustomerName || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(customerData?.summary.topCustomerSpent || 0)} spent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Bookings</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(customerData?.summary.averageBookingsPerCustomer || 0).toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per customer
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter customer data by various criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportFilters
            filters={filterConfigs}
            values={filters}
            onChange={(key, value) => {
              setFilters(prev => ({ ...prev, [key]: value }));
            }}
            onReset={() => {
              setFilters({
                dateRange: [subDays(new Date(), 30), new Date()],
                tier: [],
                spendingRange: [0, 50000],
                customer: '',
                bookingsRange: [0, 100],
                lastVisitDays: '90'
              });
            }}
          />
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">All Transactions</TabsTrigger>
          <TabsTrigger value="customers">Customer Analysis</TabsTrigger>
          <TabsTrigger value="tiers">Tier Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Transactions</CardTitle>
              <CardDescription>
                Detailed view of all customer transactions with filtering and export options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportDataTable
                data={filteredTransactions}
                columns={columns}
                loading={isLoading}
                title="Customer Transactions"
                searchPlaceholder="Search transactions..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Analysis</CardTitle>
              <CardDescription>
                Individual customer performance with lifetime value and behavior metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportDataTable
                data={filteredCustomers}
                columns={customerColumns}
                loading={isLoading}
                title="Customer Analysis"
                searchPlaceholder="Search customers..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Tier Analysis</CardTitle>
              <CardDescription>
                Customer segmentation by spending tiers and behavior patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportDataTable
                data={customerData?.segments || []}
                columns={tierColumns}
                loading={isLoading}
                title="Tier Analysis"
                searchPlaceholder="Search tiers..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
