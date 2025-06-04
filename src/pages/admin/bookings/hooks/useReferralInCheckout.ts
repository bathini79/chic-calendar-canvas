import { useState, useEffect, useMemo } from "react";
import { useReferralProgram } from "@/hooks/use-referral-program";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseReferralInCheckoutProps {
  customerId?: string;
  subtotal: number;
  serviceTotal: number;
  membershipTotal: number;
  productTotal: number;
  isNewCustomer: boolean;
}

interface UseReferralInCheckoutResult {
  isReferralEnabled: boolean;
  isReferralApplicable: boolean;
  referrers: any[];
  allCustomers: any[];
  selectedReferrerId: string | null;
  setSelectedReferrerId: (id: string | null) => void;
  isLoadingReferrers: boolean;
  potentialCashback: number; // Cashback for referrer
  customerCashback: number; // Cashback for the new customer
  referralDiscount: number; // Discount applied to current purchase
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchReferrers: () => Promise<void>;
}

export function useReferralInCheckout({
  customerId,
  subtotal,
  serviceTotal,
  membershipTotal,
  productTotal,
  isNewCustomer
}: UseReferralInCheckoutProps): UseReferralInCheckoutResult {
  const [referrers, setReferrers] = useState<any[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedReferrerId, setSelectedReferrerId] = useState<string | null>(null);
  const [isLoadingReferrers, setIsLoadingReferrers] = useState(false);
  
  const { referralProgram, isLoading } = useReferralProgram();  // Since we're only dealing with new customers, we don't need to check for existing referrers
  // The referral system only applies to the first appointment
  useEffect(() => {
    // Reset selection when customerId changes
    setSelectedReferrerId(null);
    setReferrers([]);
    setSearchTerm("");
    
  // Fetch initial set of referrers (top customers except the current one)
    const fetchInitialReferrers = async () => {
      try {
        setIsLoadingReferrers(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, phone_number')
          .eq('role', 'customer')
          .neq('id', customerId || '') // Exclude the current customer
          .limit(10); // Show 10 initial customers
          
        if (error) throw error;
        setReferrers(data || []);
        setAllCustomers(data || []);
      } catch (error: any) {
        console.error('Error fetching initial referrers:', error);
        toast.error(`Failed to fetch customers: ${error.message}`);
      } finally {
        setIsLoadingReferrers(false);
      }
    };
      if (customerId && isNewCustomer) {
      fetchInitialReferrers();
    }
  }, [customerId, isNewCustomer]);

  // Determine if referral system is applicable for this checkout
  const isReferralApplicable = useMemo(() => {
    if (!referralProgram?.is_enabled) return false;
    if (!isNewCustomer) return false;
    if (!customerId) return false;
    if (subtotal <= 0) return false;
    
    return true;
  }, [referralProgram?.is_enabled, isNewCustomer, customerId, subtotal]);

  // Calculate potential cashback based on the selected service, membership, and product totals
  const potentialCashback = useMemo(() => {
    if (!isReferralApplicable || !selectedReferrerId || !referralProgram) return 0;
    
    let totalCashback = 0;
    
    // Calculate service cashback
    if (serviceTotal > 0) {
      if (referralProgram.service_reward_type === 'percentage' && referralProgram.service_percentage) {
        totalCashback += serviceTotal * (referralProgram.service_percentage / 100);
      } else if (referralProgram.service_reward_type === 'fixed' && referralProgram.service_fixed_amount) {
        totalCashback += referralProgram.service_fixed_amount;
      }
    }
    
    // Calculate membership cashback
    if (membershipTotal > 0) {
      if (referralProgram.membership_reward_type === 'percentage' && referralProgram.membership_percentage) {
        totalCashback += membershipTotal * (referralProgram.membership_percentage / 100);
      } else if (referralProgram.membership_reward_type === 'fixed' && referralProgram.membership_fixed_amount) {
        totalCashback += referralProgram.membership_fixed_amount;
      }
    }
    
    // Calculate product cashback
    if (productTotal > 0) {
      if (referralProgram.product_reward_type === 'percentage' && referralProgram.product_percentage) {
        totalCashback += productTotal * (referralProgram.product_percentage / 100);
      } else if (referralProgram.product_reward_type === 'fixed' && referralProgram.product_fixed_amount) {
        totalCashback += referralProgram.product_fixed_amount;
      }
    }
    
    return Math.round(totalCashback * 100) / 100; // Round to 2 decimal places
  }, [
    isReferralApplicable,
    selectedReferrerId,
    referralProgram,
    serviceTotal,
    membershipTotal,
    productTotal
  ]);  // Function to search for potential referrers - now uses the already loaded customers list
  const searchReferrers = async () => {
    // The search is now handled by the useEffect that filters allCustomers
    // This function exists to maintain the interface compatibility
    if (!searchTerm || searchTerm.length < 2) {
      setReferrers([]);
      return;
    }
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    // Filter from the already fetched customers list
    const filteredCustomers = allCustomers.filter(customer => 
      customer.full_name?.toLowerCase().includes(lowerSearchTerm) || 
      customer.phone_number?.includes(searchTerm)
    );
    
    setReferrers(filteredCustomers);
  };  // Search for referrers based on name or phone number
  useEffect(() => {
    const searchReferrers = async () => {
      if (!searchTerm || searchTerm.length < 2) {
        // If no search term, show the initial 10 customers
        setReferrers(allCustomers);
        return;
      }
      
      try {
        setIsLoadingReferrers(true);
        
        // Search in database for more comprehensive results
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, phone_number')
          .eq('role', 'customer')
          .neq('id', customerId || '')
          .or(`full_name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%`)
          .order('full_name', { ascending: true })
          .limit(10);
          
        if (error) throw error;
        setReferrers(data || []);
      } catch (error: any) {
        console.error('Error searching referrers:', error);
        toast.error(`Failed to search customers: ${error.message}`);
        setReferrers([]);
      } finally {
        setIsLoadingReferrers(false);
      }
    };
    
    const debounceTimer = setTimeout(searchReferrers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, customerId, allCustomers]);
  
  // Calculate customer cashback (equal to referrer cashback)
  const customerCashback = useMemo(() => {
    if (!isReferralApplicable || !selectedReferrerId || !referralProgram) return 0;
    // Give the same cashback to the customer as the referrer gets
    return potentialCashback;
  }, [isReferralApplicable, selectedReferrerId, referralProgram, potentialCashback]);
  return {
    isReferralEnabled: referralProgram?.is_enabled || false,
    isReferralApplicable,
    referrers,
    allCustomers,
    selectedReferrerId,
    setSelectedReferrerId,
    isLoadingReferrers,
    potentialCashback,
    customerCashback,
    referralDiscount: 0, // Default to 0 as there's no discount on first purchase
    searchTerm,
    setSearchTerm,
    searchReferrers
  };
}
