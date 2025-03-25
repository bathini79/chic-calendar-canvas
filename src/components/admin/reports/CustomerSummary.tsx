
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader } from 'lucide-react';
import { subDays, format } from 'date-fns';

interface CustomerStatProps {
  value: number | string;
  label: string;
}

function CustomerStat({ value, label }: CustomerStatProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6">
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

export function CustomerSummary() {
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  
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
          
        if (totalError || newError || prepaidError || membershipError) {
          throw new Error('Error fetching customer statistics');
        }
        
        return {
          totalCustomers: totalCustomers || 0,
          newCustomers: newCustomers || 0,
          prepaidCustomers: prepaidCustomers || 0,
          membershipCustomers: membershipCustomers || 0
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
            label="Total" 
          />
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-0">
          <CustomerStat 
            value={customerStats?.newCustomers || 0} 
            label="New" 
          />
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-0">
          <CustomerStat 
            value={customerStats?.prepaidCustomers || 0} 
            label="Prepaid" 
          />
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-0">
          <CustomerStat 
            value={customerStats?.membershipCustomers || 0} 
            label="Membership" 
          />
        </CardContent>
      </Card>
    </div>
  );
}
