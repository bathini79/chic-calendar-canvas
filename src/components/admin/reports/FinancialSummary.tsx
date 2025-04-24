
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Filter } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RevenueDataTable } from './RevenueDataTable';
import { PaymentBySource } from './PaymentBySource';

interface FinancialSummaryProps {
  onBack: () => void;
}

export function FinancialSummary({ onBack }: FinancialSummaryProps) {
  const [activeTab, setActiveTab] = useState('revenue-summary');

  // Get today and start of last month for the default date range
  const today = new Date();
  const startOfLastMonth = startOfMonth(subMonths(today, 1));
  const endOfLastMonth = endOfMonth(subMonths(today, 1));
  
  const [dateRange, setDateRange] = useState({
    startDate: startOfLastMonth,
    endDate: endOfLastMonth
  });
  
  // Format date range for display
  const formattedDateRange = () => {
    return `${format(dateRange.startDate, 'MMM d, yyyy')} - ${format(dateRange.endDate, 'MMM d, yyyy')}`;
  };
  
  // Get basic summary data
  const { data: summaryData, isLoading: loadingSummary } = useQuery({
    queryKey: ['financial-summary', dateRange],
    queryFn: async () => {
      const startDateStr = format(dateRange.startDate, 'yyyy-MM-dd');
      const endDateStr = format(dateRange.endDate, 'yyyy-MM-dd');
      
      // Get total revenue
      const { data: revenueData, error: revenueError } = await supabase
        .from('appointments')
        .select('total_price, tax_amount, discount_value')
        .gte('created_at', `${startDateStr}`)
        .lte('created_at', `${endDateStr}`)
        .eq('transaction_type', 'sale');
      
      if (revenueError) throw revenueError;
      
      // Get refunds
      const { data: refundsData, error: refundsError } = await supabase
        .from('appointments')
        .select('total_price')
        .gte('created_at', `${startDateStr}`)
        .lte('created_at', `${endDateStr}`)
        .eq('transaction_type', 'refund');
      
      if (refundsError) throw refundsError;
      
      // Get membership revenue
      const { data: membershipData, error: membershipError } = await supabase
        .from('membership_sales')
        .select('total_amount')
        .gte('sale_date', `${startDateStr}`)
        .lte('sale_date', `${endDateStr}`)
        .eq('status', 'completed');
      
      if (membershipError) throw membershipError;
      
      // Calculate summary values
      const totalRevenue = revenueData?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;
      const totalRefunds = refundsData?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;
      const totalMemberships = membershipData?.reduce((sum, item) => sum + (item.total_amount || 0), 0) || 0;
      const totalTaxCollected = revenueData?.reduce((sum, item) => sum + (item.tax_amount || 0), 0) || 0;
      const totalDiscounts = revenueData?.reduce((sum, item) => sum + (item.discount_value || 0), 0) || 0;
      
      // Get transaction count
      const transactionCount = (revenueData?.length || 0) + (refundsData?.length || 0);
      
      return {
        totalRevenue,
        totalRefunds,
        totalMemberships,
        totalTaxCollected,
        totalDiscounts,
        netRevenue: totalRevenue - totalRefunds,
        transactionCount,
        avgTransactionValue: transactionCount > 0 ? totalRevenue / transactionCount : 0
      };
    }
  });
  
  // Format currency values
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h2 className="text-2xl font-bold">Financial Summary</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="text-sm">
            {formattedDateRange()}
          </Button>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-10 w-[150px]" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(summaryData?.totalRevenue || 0)}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-10 w-[150px]" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(summaryData?.netRevenue || 0)}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Refunds</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-10 w-[150px]" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(summaryData?.totalRefunds || 0)}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tax Collected</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-10 w-[150px]" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(summaryData?.totalTaxCollected || 0)}</div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Memberships</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-10 w-[150px]" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(summaryData?.totalMemberships || 0)}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Discounts</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-10 w-[150px]" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(summaryData?.totalDiscounts || 0)}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Transaction Count</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-10 w-[150px]" />
            ) : (
              <div className="text-2xl font-bold">{summaryData?.transactionCount || 0}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-10 w-[150px]" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(summaryData?.avgTransactionValue || 0)}</div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue-summary">Revenue Summary</TabsTrigger>
          <TabsTrigger value="payment-source">Payment by Source</TabsTrigger>
        </TabsList>
        
        <TabsContent value="revenue-summary">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Data</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <RevenueDataTable dateRange={dateRange} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="payment-source">
          <PaymentBySource onBack={() => setActiveTab('revenue-summary')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
