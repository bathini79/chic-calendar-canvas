import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculatePackagePrice, getTotalPrice } from '../utils/bookingUtils';
import type { Service, Package, Customer } from '../types';

interface UseMembershipInCheckoutProps {
  selectedCustomer: Customer | null;
  selectedServices: string[];
  selectedPackages: string[];
  services: Service[];
  packages: Package[];
  customizedServices: Record<string, string[]>;
}

export const useMembershipInCheckout = ({
  selectedCustomer,
  selectedServices,
  selectedPackages,
  services,
  packages,
  customizedServices,
}: UseMembershipInCheckoutProps) => {
  const [membershipDiscount, setMembershipDiscount] = useState<number>(0);
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [membershipName, setMembershipName] = useState<string | null>(null);

  const { data: customerMemberships = [] } = useQuery({
    queryKey: ["customer-memberships", selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      
      const { data, error } = await supabase
        .from("customer_memberships")
        .select(
          `
          id,
          status,
          membership:memberships(
            id, 
            name, 
            discount_type, 
            discount_value,
            max_discount_value,
            min_billing_amount,
            applicable_services, 
            applicable_packages
          )
        `
        )
        .eq("customer_id", selectedCustomer.id)
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
    enabled: !!selectedCustomer,
  });

  useEffect(() => {
    let bestDiscount = 0;
    let bestMembershipId = null;
    let bestMembershipName = null;

    if (
      customerMemberships.length > 0 &&
      (selectedServices.length > 0 || selectedPackages.length > 0)
    ) {
      // Calculate total bill amount first
      const totalBillAmount = getTotalPrice(
        selectedServices,
        selectedPackages,
        services,
        packages,
        customizedServices
      );

      // Process each membership to find the best discount
      customerMemberships.forEach((membership) => {
        const membershipData = membership.membership;
        if (!membershipData) return;

        // Check minimum billing amount first
        if (membershipData.min_billing_amount && totalBillAmount < membershipData.min_billing_amount) {
          return;
        }

        let currentMembershipDiscount = 0;

        // Calculate discounts for individual services
        selectedServices.forEach((serviceId) => {
          const service = services.find((s) => s.id === serviceId);
          if (!service) return;

          const isServiceEligible =
            membershipData.applicable_services?.includes(serviceId) ||
            membershipData.applicable_services?.length === 0;

          if (isServiceEligible) {
            let serviceDiscount = 0;
            if (membershipData.discount_type === "percentage") {
              serviceDiscount = service.selling_price * (membershipData.discount_value / 100);
            } else if (membershipData.discount_type === "fixed") {
              // For fixed discount, distribute it proportionally based on price
              const serviceRatio = service.selling_price / totalBillAmount;
              serviceDiscount = membershipData.discount_value * serviceRatio;
            }
            currentMembershipDiscount += serviceDiscount;
          }
        });

        // Calculate discounts for packages
        selectedPackages.forEach((packageId) => {
          const pkg = packages.find((p) => p.id === packageId);
          if (!pkg) return;

          const isPackageEligible =
            membershipData.applicable_packages?.includes(packageId) ||
            membershipData.applicable_packages?.length === 0;

          if (isPackageEligible) {
            // Calculate total package price including customized services
            const packagePrice = calculatePackagePrice(pkg, customizedServices[packageId] || [], services);

            // Calculate discount for the entire package
            let packageDiscount = 0;
            if (membershipData.discount_type === "percentage") {
              packageDiscount = packagePrice * (membershipData.discount_value / 100);
            } else if (membershipData.discount_type === "fixed") {
              // For fixed discount, distribute it proportionally based on total bill
              const packageRatio = packagePrice / totalBillAmount;
              packageDiscount = membershipData.discount_value * packageRatio;
            }
            currentMembershipDiscount += packageDiscount;
          }
        });

        // Apply max discount cap if set
        if (membershipData.max_discount_value) {
          currentMembershipDiscount = Math.min(currentMembershipDiscount, membershipData.max_discount_value);
        }

        // Ensure we never discount more than the total bill amount
        currentMembershipDiscount = Math.min(currentMembershipDiscount, totalBillAmount);

        // Update best discount if this membership gives better discount
        if (currentMembershipDiscount > bestDiscount) {
          bestDiscount = currentMembershipDiscount;
          bestMembershipId = membershipData.id;
          bestMembershipName = membershipData.name;
        }
      });
    }

    setMembershipDiscount(bestDiscount);
    setMembershipId(bestMembershipId);
    setMembershipName(bestMembershipName);
  }, [
    customerMemberships,
    selectedServices,
    selectedPackages,
    services,
    packages,
    customizedServices,
  ]);

  return {
    membershipDiscount,
    membershipId,
    membershipName,
    customerMemberships
  };
};