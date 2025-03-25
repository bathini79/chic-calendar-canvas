
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader } from 'lucide-react';
import { subDays, format } from 'date-fns';

interface CustomerStatProps {
  value: number | string;
  label: string;
  secondaryValue?: string;
  secondaryLabel?: string;
}

function CustomerStat({ value, label, secondaryValue, secondaryLabel }: CustomerStatProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6">
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      {secondaryValue && (
        <div className="mt-2 flex flex-col items-center">
          <div className="text-lg font-medium">{secondaryValue}</div>
          <div className="text-xs text-muted-foreground">{secondaryLabel}</div>
        </div>
      )}
    </div>
  );
}

export function CustomerSummary() {
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const sixtyDaysAgo = format(subDays(new Date(), 60), 'yyyy-MM-dd');
  
  const { data: customerStats, isLoading } = useQuery({
    queryKey: ['customer-stats'],
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
          
        // Get customers with prepaid balance
        const { count: prepaidCustomers, error: prepaidError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'customer')
          .gt('wallet_balance', 0);
          
        // Get customers with active memberships
        const { count: membershipCustomers, error: membershipError } = await supabase
          .from('customer_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');
        
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
        
        // Get unique customers with appointments
        const uniqueActiveCustomers = activeCustomers ? 
          [...new Set(activeCustomers.map(a => a.customer_id))] : [];
        
        // Calculate retention rate
        let retentionRate = 0;
        if (customersStart && customersStart > 0) {
          retentionRate = (uniqueActiveCustomers.length / customersStart) * 100;
        }
          
        if (totalError || newError || prepaidError || membershipError || startError || activeError) {
          throw new Error('Error fetching customer statistics');
        }
        
        return {
          totalCustomers: totalCustomers || 0,
          newCustomers: newCustomers || 0,
          prepaidCustomers: prepaidCustomers || 0,
          membershipCustomers: membershipCustomers || 0,
          retentionRate: retentionRate.toFixed(1)
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
          />
        </CardContent>
      </Card>
    </div>
  );
}
