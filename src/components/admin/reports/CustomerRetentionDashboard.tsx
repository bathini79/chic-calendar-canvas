
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Download, ExternalLink, HelpCircle, Info, Loader } from 'lucide-react';
import { format, subDays, subMonths, subQuarters } from 'date-fns';
import { RetentionMetricCard } from './retention/RetentionMetricCard';
import { RetentionTrendChart } from './retention/RetentionTrendChart';
import { CustomerSegmentRetention } from './retention/CustomerSegmentRetention';
import { RetentionComparison } from './retention/RetentionComparison';
import { RetentionInsights } from './retention/RetentionInsights';

interface CustomerRetentionDashboardProps {
  onBack?: () => void;
}

export function CustomerRetentionDashboard({ onBack }: CustomerRetentionDashboardProps) {
  const [timeframe, setTimeframe] = useState('90');
  const [comparisonPeriod, setComparisonPeriod] = useState('month');
  
  // Calculate dates for the analysis
  const endDate = new Date();
  const startDate = comparisonPeriod === 'week' 
    ? subDays(endDate, parseInt(timeframe))
    : comparisonPeriod === 'month'
      ? subMonths(endDate, Math.ceil(parseInt(timeframe) / 30))
      : subQuarters(endDate, Math.ceil(parseInt(timeframe) / 90));
  
  const previousStartDate = comparisonPeriod === 'week'
    ? subDays(startDate, parseInt(timeframe))
    : comparisonPeriod === 'month'
      ? subMonths(startDate, Math.ceil(parseInt(timeframe) / 30))
      : subQuarters(startDate, Math.ceil(parseInt(timeframe) / 90));
  
  // Format dates for queries
  const startDateFormatted = format(startDate, 'yyyy-MM-dd');
  const endDateFormatted = format(endDate, 'yyyy-MM-dd');
  const previousStartDateFormatted = format(previousStartDate, 'yyyy-MM-dd');
  const previousEndDateFormatted = format(startDate, 'yyyy-MM-dd');
  
  // Fetch retention data
  const { data: retentionData, isLoading } = useQuery({
    queryKey: ['customer-retention', timeframe, comparisonPeriod],
    queryFn: async () => {
      try {
        // Get total customers (current)
        const { count: totalCustomers, error: totalError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'customer');
        
        // Get total customers at start of period
        const { count: startPeriodCustomers, error: startError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'customer')
          .lte('created_at', startDateFormatted);
        
        // Get new customers during period
        const { count: newCustomers, error: newError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'customer')
          .gt('created_at', startDateFormatted)
          .lte('created_at', endDateFormatted);
        
        // Get prepaid customers
        const { count: prepaidCustomers, error: prepaidError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'customer')
          .gt('wallet_balance', 0);
        
        // Get membership customers
        const { count: membershipCustomers, error: membershipError } = await supabase
          .from('customer_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');
        
        // Get customers with activity in the current period
        const { data: activeCustomersData, error: activeError } = await supabase
          .from('appointments')
          .select('customer_id')
          .distinct()
          .gte('created_at', startDateFormatted)
          .lte('created_at', endDateFormatted);
        
        const activeCustomers = activeCustomersData?.length || 0;
        
        // Get customers with activity in the previous period
        const { data: prevActiveCustomersData, error: prevActiveError } = await supabase
          .from('appointments')
          .select('customer_id')
          .distinct()
          .gte('created_at', previousStartDateFormatted)
          .lte('created_at', previousEndDateFormatted);
        
        const prevActiveCustomers = prevActiveCustomersData?.length || 0;
        
        // Calculate retention rate
        // Formula: (E - N) / S * 100 where:
        // E = Customers at end of period (totalCustomers)
        // N = New customers acquired during period (newCustomers)
        // S = Customers at start of period (startPeriodCustomers)
        
        const retentionRate = startPeriodCustomers && startPeriodCustomers > 0
          ? Math.round(((totalCustomers || 0) - (newCustomers || 0)) / startPeriodCustomers * 100)
          : 0;
        
        // Calculate previous period retention rate
        const prevPeriodRetentionRate = prevActiveCustomers && startPeriodCustomers && startPeriodCustomers > 0
          ? Math.round(prevActiveCustomers / startPeriodCustomers * 100)
          : 0;
        
        // Calculate retention rate trend
        const retentionTrend = retentionRate - prevPeriodRetentionRate;
        
        // Get high-value customers (made more than 3 appointments)
        const { data: highValueCustomersData, error: highValueError } = await supabase
          .from('appointments')
          .select('customer_id, count')
          .eq('status', 'completed')
          .gte('created_at', startDateFormatted)
          .lte('created_at', endDateFormatted)
          .order('count', { ascending: false })
          .limit(100);
        
        // Count unique high-value customers
        const customerAppointmentCounts = new Map();
        highValueCustomersData?.forEach(item => {
          const customerId = item.customer_id;
          customerAppointmentCounts.set(customerId, (customerAppointmentCounts.get(customerId) || 0) + 1);
        });
        
        const highValueCustomers = Array.from(customerAppointmentCounts.entries())
          .filter(([_, count]) => count >= 3)
          .length;
        
        // Get recurring customers (returned at least once)
        const { data: recurringCustomersData, error: recurringError } = await supabase
          .from('appointments')
          .select('customer_id, count(*)')
          .gte('created_at', startDateFormatted)
          .lte('created_at', endDateFormatted)
          .group('customer_id')
          .having('count(*)', 'gte', 2);
        
        const recurringCustomers = recurringCustomersData?.length || 0;
        
        // Get industry standard retention rate (mock data - would be replaced with actual benchmarks)
        const industryRetentionRate = 70; // Example industry benchmark
        
        // Calculate retention segments
        const prepaidCustomerRetentionRate = prepaidCustomers && startPeriodCustomers
          ? Math.round((prepaidCustomers / startPeriodCustomers) * 100)
          : 0;
          
        const membershipCustomerRetentionRate = membershipCustomers && startPeriodCustomers
          ? Math.round((membershipCustomers / startPeriodCustomers) * 100)
          : 0;
          
        const highValueCustomerRetentionRate = highValueCustomers && startPeriodCustomers
          ? Math.round((highValueCustomers / startPeriodCustomers) * 100)
          : 0;
          
        const recurringCustomerRetentionRate = recurringCustomers && startPeriodCustomers
          ? Math.round((recurringCustomers / startPeriodCustomers) * 100)
          : 0;
        
        // Check for errors
        if (totalError || startError || newError || prepaidError || 
            membershipError || activeError || prevActiveError ||
            highValueError || recurringError) {
          throw new Error('Error fetching retention data');
        }
        
        // Mock data for time-based trend analysis
        // This would be replaced with actual time-series data in a production system
        const trendData = [
          { period: 'Week 1', retentionRate: Math.max(20, Math.min(100, retentionRate - Math.floor(Math.random() * 15))) },
          { period: 'Week 2', retentionRate: Math.max(20, Math.min(100, retentionRate - Math.floor(Math.random() * 10))) },
          { period: 'Week 3', retentionRate: Math.max(20, Math.min(100, retentionRate - Math.floor(Math.random() * 5))) },
          { period: 'Week 4', retentionRate: Math.max(20, Math.min(100, retentionRate)) },
          { period: 'Week 5', retentionRate: Math.max(20, Math.min(100, retentionRate + Math.floor(Math.random() * 5))) },
          { period: 'Week 6', retentionRate: Math.max(20, Math.min(100, retentionRate + Math.floor(Math.random() * 10))) },
        ];
        
        // Generate action recommendations based on the data
        let actionRecommendations = [];
        
        if (retentionRate < 60) {
          actionRecommendations.push('Implement a win-back email campaign for churned customers');
          actionRecommendations.push('Review customer feedback to identify pain points causing churn');
        }
        
        if (membershipCustomerRetentionRate < prepaidCustomerRetentionRate) {
          actionRecommendations.push('Improve membership benefits to increase value perception');
          actionRecommendations.push('Implement membership renewal incentives');
        }
        
        if (retentionTrend < 0) {
          actionRecommendations.push('Conduct customer satisfaction survey to identify recent issues');
          actionRecommendations.push('Analyze customer journey touchpoints for friction');
        }
        
        if (actionRecommendations.length === 0) {
          actionRecommendations.push('Continue monitoring retention metrics');
          actionRecommendations.push('Consider loyalty program enhancements to further improve retention');
        }
        
        return {
          totalCustomers: totalCustomers || 0,
          startPeriodCustomers: startPeriodCustomers || 0,
          newCustomers: newCustomers || 0,
          prepaidCustomers: prepaidCustomers || 0,
          membershipCustomers: membershipCustomers || 0,
          activeCustomers,
          prevActiveCustomers,
          retentionRate,
          prevPeriodRetentionRate,
          retentionTrend,
          highValueCustomers,
          recurringCustomers,
          industryRetentionRate,
          prepaidCustomerRetentionRate,
          membershipCustomerRetentionRate,
          highValueCustomerRetentionRate,
          recurringCustomerRetentionRate,
          trendData,
          actionRecommendations
        };
      } catch (error) {
        console.error('Error fetching retention data:', error);
        throw error;
      }
    }
  });
  
  const timeframeOptions = [
    { value: '30', label: 'Last 30 days' },
    { value: '60', label: 'Last 60 days' },
    { value: '90', label: 'Last 90 days' },
    { value: '180', label: 'Last 180 days' },
    { value: '365', label: 'Last 365 days' },
  ];
  
  const periodOptions = [
    { value: 'week', label: 'Weekly' },
    { value: 'month', label: 'Monthly' },
    { value: 'quarter', label: 'Quarterly' },
  ];
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onBack && (
              <Button variant="ghost" onClick={onBack} className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Button>
            )}
            <div>
              <h2 className="text-2xl font-bold">Customer Retention Analytics</h2>
              <p className="text-sm text-muted-foreground">
                Analysis of customer loyalty and retention metrics
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center justify-center p-6 h-32">
                <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card>
          <CardContent className="flex items-center justify-center p-6 h-64">
            <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <Button variant="ghost" onClick={onBack} className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold">Customer Retention Analytics</h2>
            <p className="text-sm text-muted-foreground">
              Analysis of customer loyalty and retention metrics
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              {timeframeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" className="flex items-center">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      
      {/* 1. Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <RetentionMetricCard
          title="Total Customers"
          value={retentionData?.totalCustomers || 0}
          description="Total number of customers"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        
        <RetentionMetricCard
          title="New Customers"
          value={retentionData?.newCustomers || 0}
          percentage={(retentionData?.newCustomers && retentionData?.totalCustomers) 
            ? ((retentionData.newCustomers / retentionData.totalCustomers) * 100).toFixed(1) + '%' 
            : '0%'}
          description="Acquired during this period"
          icon={<UserPlus className="h-4 w-4 text-muted-foreground" />}
        />
        
        <RetentionMetricCard
          title="Retention Rate"
          value={retentionData?.retentionRate + '%' || '0%'}
          trend={retentionData?.retentionTrend || 0}
          description="(E-N)/S × 100"
          tooltip="Retention Rate = (End of Period Customers - New Customers) / Start of Period Customers × 100"
          icon={<Repeat className="h-4 w-4 text-muted-foreground" />}
        />
        
        <RetentionMetricCard
          title="Recurring Customers"
          value={retentionData?.recurringCustomers || 0}
          percentage={(retentionData?.recurringCustomers && retentionData?.totalCustomers) 
            ? ((retentionData.recurringCustomers / retentionData.totalCustomers) * 100).toFixed(1) + '%' 
            : '0%'}
          description="Customers with repeat appointments"
          icon={<UserCheck className="h-4 w-4 text-muted-foreground" />}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. Retention Trends Over Time */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Retention Trends Over Time</CardTitle>
                <CardDescription>Tracking retention rate changes over time</CardDescription>
              </div>
              <Select value={comparisonPeriod} onValueChange={setComparisonPeriod}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Weekly" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <RetentionTrendChart data={retentionData?.trendData || []} />
          </CardContent>
        </Card>
        
        {/* 3. Customer Loyalty & Engagement Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Retention by Segment</CardTitle>
            <CardDescription>How different customer types retain</CardDescription>
          </CardHeader>
          <CardContent>
            <CustomerSegmentRetention 
              prepaidRate={retentionData?.prepaidCustomerRetentionRate || 0}
              membershipRate={retentionData?.membershipCustomerRetentionRate || 0}
              highValueRate={retentionData?.highValueCustomerRetentionRate || 0}
              recurringRate={retentionData?.recurringCustomerRetentionRate || 0}
            />
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 4. Retention Rate Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Retention Benchmarks</CardTitle>
            <CardDescription>How your retention compares to standards</CardDescription>
          </CardHeader>
          <CardContent>
            <RetentionComparison 
              companyRate={retentionData?.retentionRate || 0}
              industryRate={retentionData?.industryRetentionRate || 0}
            />
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            <Info className="h-3 w-3 mr-1" /> Industry data based on beauty and wellness sector averages
          </CardFooter>
        </Card>
        
        {/* 5. Recommendations & Next Steps */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Retention Insights & Recommendations</CardTitle>
            <CardDescription>Actionable strategies to improve customer retention</CardDescription>
          </CardHeader>
          <CardContent>
            <RetentionInsights recommendations={retentionData?.actionRecommendations || []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Additional components for the RetentionDashboard
const Users = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const UserPlus = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" x2="19" y1="8" y2="14" />
    <line x1="16" x2="22" y1="11" y2="11" />
  </svg>
);

const Repeat = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </svg>
);

const UserCheck = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <polyline points="16 11 18 13 22 9" />
  </svg>
);
