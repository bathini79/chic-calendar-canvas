
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isAfter, isBefore, parseISO } from "date-fns";
import { getMembershipDiscount } from "@/lib/utils";

export type CustomerMembership = {
  id: string;
  customer_id: string;
  membership_id: string;
  status: string;
  start_date: string;
  end_date: string;
  amount_paid: number;
  created_at: string;
  updated_at: string;
  membership?: {
    id: string;
    name: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    applicable_services: string[];
    applicable_packages: string[];
    min_billing_amount: number | null;
    max_discount_value: number | null;
  };
};

export function useCustomerMemberships() {
  const [customerMemberships, setCustomerMemberships] = useState<CustomerMembership[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchedUserId, setLastFetchedUserId] = useState<string | null>(null);

  const fetchCustomerMemberships = useCallback(async (customerId: string) => {
    if (!customerId) {
      setCustomerMemberships([]);
      return [];
    }
    
    // Skip fetch if we already fetched for this user
    if (lastFetchedUserId === customerId && customerMemberships.length > 0) {
      return customerMemberships;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_memberships')
        .select(`
          *,
          membership:memberships (
            id, name, discount_type, discount_value, 
            applicable_services, applicable_packages,
            min_billing_amount, max_discount_value
          )
        `)
        .eq('customer_id', customerId)
        .eq('status', 'active');

      if (error) throw error;
      
      // Filter memberships by validity
      const now = new Date();
      const validMemberships = data?.filter(membership => {
        const endDate = parseISO(membership.end_date);
        return isBefore(now, endDate);
      }) || [];
      
      setCustomerMemberships(validMemberships as CustomerMembership[]);
      setLastFetchedUserId(customerId);
      return validMemberships as CustomerMembership[];
    } catch (error: any) {
      console.error("Error fetching customer memberships:", error);
      toast.error(`Failed to load customer memberships: ${error.message}`);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [customerMemberships, lastFetchedUserId]);

  const getApplicableMembershipDiscount = useCallback((
    serviceId: string | null, 
    packageId: string | null, 
    amount: number
  ) => {
    if (!serviceId && !packageId) return null;
    if (!customerMemberships || customerMemberships.length === 0) return null;
    
    return getMembershipDiscount(serviceId, packageId, amount, customerMemberships);
  }, [customerMemberships]);

  return {
    customerMemberships,
    isLoading,
    fetchCustomerMemberships,
    getApplicableMembershipDiscount
  };
}
