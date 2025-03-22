
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    description: string | null;
    validity_period: number;
    validity_unit: 'days' | 'months';
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    applicable_services: string[];
    applicable_packages: string[];
  }
};

export function useCustomerMemberships(customerId?: string) {
  const [memberships, setMemberships] = useState<CustomerMembership[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeMembership, setActiveMembership] = useState<CustomerMembership | null>(null);

  const fetchMemberships = async (id?: string) => {
    if (!id) {
      setMemberships([]);
      setActiveMembership(null);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("customer_memberships")
        .select(`
          *,
          membership:memberships(
            id, name, description, validity_period, validity_unit, 
            discount_type, discount_value, applicable_services, applicable_packages
          )
        `)
        .eq("customer_id", id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        const typedData = data as CustomerMembership[];
        setMemberships(typedData);
        
        // Find active membership that's currently valid
        const now = new Date();
        const valid = typedData.find(membership => {
          const endDate = new Date(membership.end_date);
          return endDate >= now;
        });
        
        setActiveMembership(valid || null);
      } else {
        setMemberships([]);
        setActiveMembership(null);
      }
    } catch (error: any) {
      console.error("Error fetching customer memberships:", error);
      toast.error(`Error fetching memberships: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberships(customerId);
  }, [customerId]);

  return {
    memberships,
    activeMembership,
    isLoading,
    fetchMemberships
  };
}
