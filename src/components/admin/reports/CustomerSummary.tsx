
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader } from 'lucide-react';
import { subDays, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface CustomerStatProps {
  value: number | string;
  label: string;
  secondaryValue?: string;
  secondaryLabel?: string;
  trendValue?: number;
  trendLabel?: string;
}

function CustomerStat({ value, label, secondaryValue, secondaryLabel, trendValue, trendLabel }: CustomerStatProps) {
  // Determine trend badge color
  const getTrendBadge = () => {
    if (trendValue === undefined) return null;
    
    if (trendValue > 0) {
      return <Badge variant="success" className="ml-1">{trendValue > 0 ? '+' : ''}{trendValue}%</Badge>;
    } else if (trendValue < 0) {
      return <Badge variant="destructive" className="ml-1">{trendValue}%</Badge>;
    } else {
      return <Badge variant="secondary" className="ml-1">0%</Badge>;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <div className="text-3xl font-bold flex items-center">
        {value}
        {trendLabel && trendValue !== undefined && (
          <div className="ml-2 text-xs font-normal flex items-center">
            {getTrendBadge()}
            <span className="ml-1 text-muted-foreground">{trendLabel}</span>
          </div>
        )}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
      {secondaryValue && (
        <div className="mt-2 flex flex-col items-center">
          <div className="text-lg font-medium flex items-center">
            {secondaryValue}
          </div>
          <div className="text-xs text-muted-foreground">{secondaryLabel}</div>
        </div>
      )}
    </div>
  );
}

export function CustomerSummary() {
  const [timeframe, setTimeframe] = useState('30'); // Days
  
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const sixtyDaysAgo = format(subDays(new Date(), 60), 'yyyy-MM-dd');
  const ninetyDaysAgo = format(subDays(new Date(), 90), 'yyyy-MM-dd');
  
  const { data: customerStats, isLoading } = useQuery({
    queryKey: ['customer-stats', timeframe],
    queryFn: async () => {
      try {
        // Get total customers
        const { count: totalCustomers, error: totalError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'customer');
        
        // Get new customers in last 30 days
        const { count: newCustomers, error: newError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'customer')
          .gte('created_at', thirtyDaysAgo);
          
        // Get new customers in previous 30 days (30-60 days ago)
        const { count: prevPeriodNewCustomers, error: prevPeriodError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'customer')
          .gte('created_at', sixtyDaysAgo)
          .lt('created_at', thirtyDaysAgo);
          
        // Get customers with prepaid balance
        const { count: prepaidCustomers, error: prepaidError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'customer')
          .gt('wallet_balance', 0);
          
        // Get previous period prepaid customers
        const { data: prevPeriodPrepaidData, error: prevPrepaidError } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'customer')
          .gt('wallet_balance', 0)
          .lt('updated_at', thirtyDaysAgo)
          .gte('updated_at', sixtyDaysAgo);
        
        const prevPeriodPrepaidCustomers = prevPeriodPrepaidData?.length || 0;
          
        // Get customers with active memberships
        const { count: membershipCustomers, error: membershipError } = await supabase
          .from('customer_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');
          
        // Get previous period membership customers
        const { count: prevPeriodMembershipCustomers, error: prevMembershipError } = await supabase
          .from('customer_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .lt('created_at', thirtyDaysAgo)
          .gte('created_at', sixtyDaysAgo);
        
        // Get customers that existed before 60 days ago
        const { count: customersStart, error: startError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'customer')
          .lte('created_at', sixtyDaysAgo);
        
        // Get customers that were created before 60 days ago and have appointments in the last 30 days
        const { data: activeCustomers, error: activeError } = await supabase
          .from('appointments')
          .select('customer_id')
          .gte('created_at', thirtyDaysAgo)
          .lte('created_at', format(new Date(), 'yyyy-MM-dd'));
        
        // Get previous period active customers (60-90 days ago)
        const { data: prevActiveCustomers, error: prevActiveError } = await supabase
          .from('appointments')
          .select('customer_id')
          .gte('created_at', ninetyDaysAgo)
          .lte('created_at', sixtyDaysAgo);
        
        // Get unique customers with appointments
        const uniqueActiveCustomers = activeCustomers ? 
          [...new Set(activeCustomers.map(a => a.customer_id))] : [];
          
        // Get unique customers with appointments in previous period
        const uniquePrevActiveCustomers = prevActiveCustomers ? 
          [...new Set(prevActiveCustomers.map(a => a.customer_id))] : [];
        
        // Calculate retention rate
        let retentionRate = 0;
        let prevRetentionRate = 0;
        let retentionTrend = 0;
        
        if (customersStart && customersStart > 0) {
          retentionRate = Math.round((uniqueActiveCustomers.length / customersStart) * 100);
          
          // Calculate previous period retention rate
          const prevPeriodCustomersStart = customersStart - (newCustomers || 0);
          if (prevPeriodCustomersStart > 0) {
            prevRetentionRate = Math.round((uniquePrevActiveCustomers.length / prevPeriodCustomersStart) * 100);
            retentionTrend = retentionRate - prevRetentionRate;
          }
        }
        
        // Calculate growth rates
        const newCustomerGrowthRate = prevPeriodNewCustomers && prevPeriodNewCustomers > 0
          ? Math.round(((newCustomers || 0) - prevPeriodNewCustomers) / prevPeriodNewCustomers * 100)
          : 0;
          
        const prepaidGrowthRate = prevPeriodPrepaidCustomers > 0
          ? Math.round(((prepaidCustomers || 0) - prevPeriodPrepaidCustomers) / prevPeriodPrepaidCustomers * 100)
          : 0;
          
        const membershipGrowthRate = prevPeriodMembershipCustomers && prevPeriodMembershipCustomers > 0
          ? Math.round(((membershipCustomers || 0) - prevPeriodMembershipCustomers) / prevPeriodMembershipCustomers * 100)
          : 0;
          
        if (totalError || newError || prepaidError || membershipError || startError || activeError || 
            prevPeriodError || prevPrepaidError || prevMembershipError || prevActiveError) {
          throw new Error('Error fetching customer statistics');
        }
        
        return {
          totalCustomers: totalCustomers || 0,
          newCustomers: newCustomers || 0,
          prepaidCustomers: prepaidCustomers || 0,
          membershipCustomers: membershipCustomers || 0,
          retentionRate,
          retentionTrend,
          newCustomerGrowthRate,
          prepaidGrowthRate,
          membershipGrowthRate
        };
      } catch (error) {
        console.error('Error fetching customer statistics:', error);
        throw error;
      }
    }
  });
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-center p-6 h-28">
              <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-0">
          <CustomerStat 
            value={customerStats?.totalCustomers || 0} 
            label="Total Customers" 
            secondaryValue={customerStats?.retentionRate + '%'} 
            secondaryLabel="Retention Rate" 
            trendValue={customerStats?.retentionTrend}
            trendLabel="vs prev period"
          />
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-0">
          <CustomerStat 
            value={customerStats?.newCustomers || 0} 
            label="New Customers" 
            secondaryValue={(((customerStats?.newCustomers || 0) / (customerStats?.totalCustomers || 1)) * 100).toFixed(1) + '%'} 
            secondaryLabel="Growth Rate" 
            trendValue={customerStats?.newCustomerGrowthRate}
            trendLabel="vs prev period"
          />
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-0">
          <CustomerStat 
            value={customerStats?.prepaidCustomers || 0} 
            label="Prepaid Customers" 
            secondaryValue={(((customerStats?.prepaidCustomers || 0) / (customerStats?.totalCustomers || 1)) * 100).toFixed(1) + '%'} 
            secondaryLabel="of Total" 
            trendValue={customerStats?.prepaidGrowthRate}
            trendLabel="vs prev period"
          />
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-0">
          <CustomerStat 
            value={customerStats?.membershipCustomers || 0} 
            label="Membership Customers" 
            secondaryValue={(((customerStats?.membershipCustomers || 0) / (customerStats?.totalCustomers || 1)) * 100).toFixed(1) + '%'} 
            secondaryLabel="of Total" 
            trendValue={customerStats?.membershipGrowthRate}
            trendLabel="vs prev period"
          />
        </CardContent>
      </Card>
    </div>
  );
}
