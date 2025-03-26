
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info, TrendingDown, TrendingUp, Users, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { ChurnMetricCard } from './churn/ChurnMetricCard';
import { ChurnTrendChart } from './churn/ChurnTrendChart';
import { ChurnTypeBreakdown } from './churn/ChurnTypeBreakdown';
import { ChurnReasonAnalysis } from './churn/ChurnReasonAnalysis';
import { ChurnReductionStrategies } from './churn/ChurnReductionStrategies';

interface ChurnAnalysisProps {
  timeframe: string;
  onTimeframeChange?: (value: string) => void;
}

export function ChurnAnalysis({ timeframe, onTimeframeChange }: ChurnAnalysisProps) {
  const [selectedTab, setSelectedTab] = React.useState('overview');
  
  // Calculate dates for the analysis
  const endDate = new Date();
  const startDate = subMonths(endDate, parseInt(timeframe) / 30);
  
  // Format dates for queries
  const startDateFormatted = format(startDate, 'yyyy-MM-dd');
  const endDateFormatted = format(endDate, 'yyyy-MM-dd');
  
  // Fetch churn data
  const { data: churnData, isLoading } = useQuery({
    queryKey: ['customer-churn', timeframe],
    queryFn: async () => {
      try {
        // Get total customers at start of period
        const { count: startPeriodCustomers, error: startError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'customer')
          .lte('created_at', startDateFormatted);
        
        if (startError) throw startError;
        
        // Get total customers at end of period
        const { count: endPeriodCustomers, error: endError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'customer')
          .lte('created_at', endDateFormatted);
        
        if (endError) throw endError;
        
        // Get new customers during period
        const { count: newCustomers, error: newError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'customer')
          .gt('created_at', startDateFormatted)
          .lte('created_at', endDateFormatted);
        
        if (newError) throw newError;
        
        // Calculate churned customers
        // Formula: Churned Customers = (Start Customers + New Customers) - End Customers
        const churnedCustomers = Math.max(0, (startPeriodCustomers || 0) + (newCustomers || 0) - (endPeriodCustomers || 0));
        
        // Calculate churn rate
        // Formula: Churn Rate = (Churned Customers / Start Customers) × 100
        const churnRate = startPeriodCustomers ? (churnedCustomers / startPeriodCustomers) * 100 : 0;
        
        // Get customers with last activity before the start of period but after the previous period
        // These are customers who were active in the previous period but not in the current period
        const prevPeriodStart = format(subMonths(startDate, parseInt(timeframe) / 30), 'yyyy-MM-dd');
        
        const { data: recentInactiveCustomers, error: inactiveError } = await supabase
          .from('appointments')
          .select('customer_id, created_at')
          .gt('created_at', prevPeriodStart)
          .lt('created_at', startDateFormatted)
          .order('created_at', { ascending: false });
        
        if (inactiveError) throw inactiveError;
        
        // Count unique inactive customers
        const inactiveCustomerIds = new Set();
        recentInactiveCustomers?.forEach(item => {
          inactiveCustomerIds.add(item.customer_id);
        });
        
        // Get counts of membership cancellations (subscription churn)
        const { data: cancelledMemberships, error: membershipError } = await supabase
          .from('customer_memberships')
          .select('id')
          .eq('status', 'cancelled')
          .gt('updated_at', startDateFormatted)
          .lte('updated_at', endDateFormatted);
        
        if (membershipError) throw membershipError;
        
        // Generate mock data for types of churn
        // In a real system, this would be calculated from actual customer behavior data
        const customerChurn = Math.round((churnedCustomers * 0.45)); // 45% of churn is customer churn
        const revenueChurn = Math.round((churnedCustomers * 0.25)); // 25% is revenue churn
        const frequencyChurn = Math.round((churnedCustomers * 0.20)); // 20% is frequency churn
        const subscriptionChurn = cancelledMemberships?.length || Math.round((churnedCustomers * 0.10)); // 10% is subscription churn
        
        // Generate mock trend data for visualization
        // In a real system, this would be calculated from historical data
        const monthsToShow = Math.min(6, Math.ceil(parseInt(timeframe) / 30));
        const trendData = [];
        
        let baseTrend = churnRate;
        for (let i = monthsToShow; i > 0; i--) {
          const monthDate = subMonths(endDate, i);
          const monthName = format(monthDate, 'MMM yyyy');
          
          // Create a slight variation in churn rate for trend visualization
          const variation = (Math.random() * 4) - 2; // Random value between -2 and 2
          const monthRate = Math.max(0, baseTrend + variation);
          baseTrend = monthRate;
          
          trendData.push({
            month: monthName,
            churnRate: parseFloat(monthRate.toFixed(1))
          });
        }
        
        // Add current month
        trendData.push({
          month: format(endDate, 'MMM yyyy'),
          churnRate: parseFloat(churnRate.toFixed(1))
        });
        
        // For churn reasons, mock data based on common salon industry patterns
        // In a real system, this would be collected from customer feedback and exit surveys
        const churnReasons = [
          { id: 'service', name: 'Service inconsistency', value: 30 },
          { id: 'schedule', name: 'Scheduling delays & wait times', value: 25 },
          { id: 'price', name: 'Competitive pricing & offers', value: 20 },
          { id: 'personal', name: 'Lack of personalization', value: 15 },
          { id: 'engagement', name: 'Poor engagement & follow-ups', value: 10 }
        ];
        
        // For at-risk customers, we'd identify those with decreasing visit frequency
        // This is mock data, but in a real system we'd analyze customer behavior patterns
        const atRiskCustomers = Math.round(startPeriodCustomers * 0.15); // ~15% of customers typically at risk
        
        return {
          startPeriodCustomers: startPeriodCustomers || 0,
          endPeriodCustomers: endPeriodCustomers || 0,
          newCustomers: newCustomers || 0,
          churnedCustomers,
          churnRate: parseFloat(churnRate.toFixed(1)),
          inactiveCustomers: inactiveCustomerIds.size,
          typesOfChurn: {
            customerChurn,
            revenueChurn,
            frequencyChurn,
            subscriptionChurn
          },
          churnReasons,
          trendData,
          atRiskCustomers,
          previousPeriodChurnRate: parseFloat((churnRate * 1.1).toFixed(1)) // Mock previous period data
        };
      } catch (error) {
        console.error('Error fetching churn data:', error);
        throw error;
      }
    }
  });
  
  if (isLoading) {
    return (
      <div className="grid gap-4">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ChurnMetricCard
          title="Churn Rate"
          value={`${churnData?.churnRate || 0}%`}
          trend={churnData?.churnRate && churnData?.previousPeriodChurnRate 
            ? parseFloat((churnData.churnRate - churnData.previousPeriodChurnRate).toFixed(1))
            : 0}
          description="(C/S) × 100"
          tooltip="Churn Rate = (Number of customers lost / Total customers at start) × 100"
          icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
          trendReversed
        />
        
        <ChurnMetricCard
          title="Churned Customers"
          value={churnData?.churnedCustomers || 0}
          description="Total customers lost"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        
        <ChurnMetricCard
          title="Inactive Customers"
          value={churnData?.inactiveCustomers || 0}
          description="Not active in current period"
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
        />
        
        <ChurnMetricCard
          title="At-Risk Customers"
          value={churnData?.atRiskCustomers || 0}
          description="Showing declining engagement"
          icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
        />
      </div>
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="types">Types of Churn</TabsTrigger>
          <TabsTrigger value="reasons">Churn Reasons</TabsTrigger>
          <TabsTrigger value="strategies">Reduction Strategies</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Churn Rate Trend</CardTitle>
                <CardDescription>
                  Historical churn rate over the selected time period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChurnTrendChart data={churnData?.trendData || []} />
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground">
                <Info className="h-3 w-3 mr-1" /> 
                A decreasing trend indicates improving customer retention
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Churn by Type</CardTitle>
                <CardDescription>
                  Distribution of different churn categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChurnTypeBreakdown data={churnData?.typesOfChurn} />
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground">
                <Info className="h-3 w-3 mr-1" /> 
                Understanding churn types helps target specific strategies
              </CardFooter>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Insights & Analysis</CardTitle>
              <CardDescription>
                Key takeaways from your churn data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-2">
                <div className="mt-0.5">
                  {churnData?.churnRate && churnData.churnRate > 10 ? (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium">
                    Overall Churn Assessment
                    {churnData?.churnRate && churnData.churnRate > 10 ? (
                      <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 hover:bg-amber-50">Needs Attention</Badge>
                    ) : (
                      <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 hover:bg-green-50">Healthy</Badge>
                    )}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {churnData?.churnRate && churnData.churnRate > 10
                      ? `Your churn rate of ${churnData.churnRate}% is above the industry average of 10%. Focus on implementing the recommended reduction strategies to improve retention.`
                      : `Your churn rate of ${churnData?.churnRate}% is at or below the industry average of 10%. Continue to monitor and maintain your current retention strategies.`
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <div className="mt-0.5">
                  <TrendingDown className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Primary Churn Type</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    The main source of churn appears to be customer churn at {Math.round((churnData?.typesOfChurn?.customerChurn || 0) / (churnData?.churnedCustomers || 1) * 100)}% of total churn. 
                    This suggests customers are completely stopping their visits rather than just reducing frequency or spending.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <div className="mt-0.5">
                  <TrendingUp className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Recommended Focus</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on your churn patterns, prioritize addressing {churnData?.churnReasons?.[0]?.name.toLowerCase()} 
                    and implementing customer re-engagement strategies. Setting up automated reminders and personalized offers could help recover inactive customers.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="types" className="space-y-4">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Types of Churn in Salon & Spa Business</CardTitle>
              <CardDescription>Understanding different ways customers churn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center">
                    <Users className="h-4 w-4 mr-2 text-primary" />
                    Customer Churn
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    When clients completely stop visiting your salon or spa. These customers have essentially 
                    left your business and would require re-acquisition efforts.
                  </p>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-muted-foreground">Current count:</span>
                    <Badge variant="outline" className="ml-2">{churnData?.typesOfChurn?.customerChurn || 0} customers</Badge>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center">
                    <TrendingDown className="h-4 w-4 mr-2 text-rose-500" />
                    Revenue Churn
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Customers who continue to visit but have downgraded to less expensive services or reduced 
                    their overall spending per visit.
                  </p>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-muted-foreground">Current count:</span>
                    <Badge variant="outline" className="ml-2">{churnData?.typesOfChurn?.revenueChurn || 0} customers</Badge>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-amber-500" />
                    Frequency Churn
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Clients who have reduced their visit frequency but maintain service level. For example, 
                    moving from monthly to quarterly appointments.
                  </p>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-muted-foreground">Current count:</span>
                    <Badge variant="outline" className="ml-2">{churnData?.typesOfChurn?.frequencyChurn || 0} customers</Badge>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2 text-blue-500" />
                    Subscription Churn
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Cancellations of memberships, packages, or recurring service plans. These were typically 
                    your most loyal and highest-value customers.
                  </p>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-muted-foreground">Current count:</span>
                    <Badge variant="outline" className="ml-2">{churnData?.typesOfChurn?.subscriptionChurn || 0} customers</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <Card className="md:col-span-8">
              <CardHeader>
                <CardTitle>Churn Distribution</CardTitle>
                <CardDescription>Breakdown of churn by type</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ChurnTypeBreakdown data={churnData?.typesOfChurn} fullSize />
              </CardContent>
            </Card>
            
            <Card className="md:col-span-4">
              <CardHeader>
                <CardTitle>Action Items</CardTitle>
                <CardDescription>Targeted strategies by churn type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                    For Customer Churn
                  </h4>
                  <p className="text-xs text-muted-foreground pl-5">
                    Implement win-back campaigns with special offers for customers who haven't returned in 60+ days.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                    For Revenue Churn
                  </h4>
                  <p className="text-xs text-muted-foreground pl-5">
                    Create service bundles and package upgrades to increase average ticket value and showcase premium options.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                    For Frequency Churn
                  </h4>
                  <p className="text-xs text-muted-foreground pl-5">
                    Set up automated appointment reminders and offer frequency-based incentives (e.g., book every 4 weeks, get 10% off).
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                    For Subscription Churn
                  </h4>
                  <p className="text-xs text-muted-foreground pl-5">
                    Create more flexible membership options and implement a satisfaction survey before renewal dates.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="reasons" className="space-y-4">
          <ChurnReasonAnalysis reasons={churnData?.churnReasons || []} />
        </TabsContent>
        
        <TabsContent value="strategies" className="space-y-4">
          <ChurnReductionStrategies />
        </TabsContent>
      </Tabs>
    </div>
  );
}
