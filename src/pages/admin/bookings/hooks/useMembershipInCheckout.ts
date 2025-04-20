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

      selectedServices.forEach((serviceId) => {
        const service = services.find((s) => s.id === serviceId);
        if (!service) return;

        customerMemberships.forEach((membership) => {
          const membershipData = membership.membership;
          if (!membershipData) return;

          // Check minimum billing amount before proceeding
          if (membershipData.min_billing_amount && totalBillAmount < membershipData.min_billing_amount) {
            return;
          }

          const isServiceEligible =
            membershipData.applicable_services?.includes(serviceId) ||
            membershipData.applicable_services?.length === 0;

          if (isServiceEligible) {
            // 1. Calculate raw discount
            let discountAmount = 0;
            if (membershipData.discount_type === "percentage") {
              discountAmount = service.selling_price * (membershipData.discount_value / 100);
            } else {
              discountAmount = membershipData.discount_value;
            }

            // 2. Apply max discount cap for both percentage and fixed discounts
            if (membershipData.max_discount_value) {
              discountAmount = Math.min(discountAmount, membershipData.max_discount_value);
            }

            // 3. Ensure we never discount more than the service price
            discountAmount = Math.min(discountAmount, service.selling_price);

            // 4. Update best discount if this one is better
            if (discountAmount > bestDiscount) {
              bestDiscount = discountAmount;
              bestMembershipId = membershipData.id;
              bestMembershipName = membershipData.name;
            }
          }
        });
      });

      selectedPackages.forEach((packageId) => {
        const pkg = packages.find((p) => p.id === packageId);
        if (!pkg) return;

        const packagePrice = calculatePackagePrice(pkg, customizedServices[packageId] || [], services);

        customerMemberships.forEach((membership) => {
          const membershipData = membership.membership;
          if (!membershipData) return;

          // Check minimum billing amount before proceeding
          if (membershipData.min_billing_amount && totalBillAmount < membershipData.min_billing_amount) {
            return;
          }

          const isPackageEligible =
            membershipData.applicable_packages?.includes(packageId) ||
            membershipData.applicable_packages?.length === 0;

          if (isPackageEligible) {
            // 1. Calculate raw discount
            let discountAmount = 0;
            if (membershipData.discount_type === "percentage") {
              discountAmount = packagePrice * (membershipData.discount_value / 100);
            } else {
              discountAmount = membershipData.discount_value;
            }

            // 2. Apply max discount cap for both percentage and fixed discounts
            if (membershipData.max_discount_value) {
              discountAmount = Math.min(discountAmount, membershipData.max_discount_value);
            }

            // 3. Ensure we never discount more than the package price
            discountAmount = Math.min(discountAmount, packagePrice);

            // 4. Update best discount if this one is better
            if (discountAmount > bestDiscount) {
              bestDiscount = discountAmount;
              bestMembershipId = membershipData.id;
              bestMembershipName = membershipData.name;
            }
          }
        });
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