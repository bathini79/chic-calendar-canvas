
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Membership = {
  id: string;
  name: string;
  description: string | null;
  validity_period: number;
  validity_unit: 'days' | 'months';
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_discount_value: number | null;
  min_billing_amount: number | null;
  applicable_services: string[];
  applicable_packages: string[];
  created_at: string;
  updated_at: string;
};

export type MembershipFormValues = Omit<Membership, 'id' | 'created_at' | 'updated_at'>;

export function useMemberships() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMemberships = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select('*')
        .order('name');

      if (error) throw error;
      
      // Properly type cast the data to ensure validity_unit is correctly typed
      const typedData = data?.map(item => ({
        ...item,
        validity_unit: item.validity_unit as 'days' | 'months',
        discount_type: item.discount_type as 'percentage' | 'fixed'
      })) as Membership[];
      
      setMemberships(typedData || []);
    } catch (error: any) {
      toast.error(`Error fetching memberships: ${error.message}`);
      console.error("Error fetching memberships:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createMembership = async (membership: MembershipFormValues): Promise<Membership | null> => {
    try {
      const { data, error } = await supabase
        .from('memberships')
        .insert([membership])
        .select()
        .single();

      if (error) throw error;
      
      const typedData = {
        ...data,
        validity_unit: data.validity_unit as 'days' | 'months',
        discount_type: data.discount_type as 'percentage' | 'fixed'
      } as Membership;
      
      toast.success("Membership created successfully");
      await fetchMemberships();
      return typedData;
    } catch (error: any) {
      toast.error(`Error creating membership: ${error.message}`);
      console.error("Error creating membership:", error);
      return null;
    }
  };

  const updateMembership = async (id: string, membership: Partial<MembershipFormValues>): Promise<Membership | null> => {
    try {
      const { data, error } = await supabase
        .from('memberships')
        .update(membership)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      const typedData = {
        ...data,
        validity_unit: data.validity_unit as 'days' | 'months',
        discount_type: data.discount_type as 'percentage' | 'fixed'
      } as Membership;
      
      toast.success("Membership updated successfully");
      await fetchMemberships();
      return typedData;
    } catch (error: any) {
      toast.error(`Error updating membership: ${error.message}`);
      console.error("Error updating membership:", error);
      return null;
    }
  };

  const deleteMembership = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('memberships')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Membership deleted successfully");
      await fetchMemberships();
      return true;
    } catch (error: any) {
      toast.error(`Error deleting membership: ${error.message}`);
      console.error("Error deleting membership:", error);
      return false;
    }
  };

  return {
    memberships,
    isLoading,
    fetchMemberships,
    createMembership,
    updateMembership,
    deleteMembership
  };
}
