import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculatePackagePrice } from '../utils/bookingUtils';
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
      selectedServices.forEach((serviceId) => {
        const service = services.find((s) => s.id === serviceId);
        if (!service) return;

        customerMemberships.forEach((membership) => {
          const membershipData = membership.membership;
          if (!membershipData) return;

          const isServiceEligible =
            membershipData.applicable_services?.includes(serviceId) ||
            membershipData.applicable_services?.length === 0;

          if (isServiceEligible) {
            const discountAmount =
              membershipData.discount_type === "percentage"
                ? service.selling_price * (membershipData.discount_value / 100)
                : Math.min(membershipData.discount_value, service.selling_price);

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

        const packagePrice = calculatePackagePrice(
          pkg,
          customizedServices[packageId] || [],
          services
        );

        customerMemberships.forEach((membership) => {
          const membershipData = membership.membership;
          if (!membershipData) return;

          const isPackageEligible =
            membershipData.applicable_packages?.includes(packageId) ||
            membershipData.applicable_packages?.length === 0;

          if (isPackageEligible) {
            const discountAmount =
              membershipData.discount_type === "percentage"
                ? packagePrice * (membershipData.discount_value / 100)
                : Math.min(membershipData.discount_value, packagePrice);

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
    membershipName
  };
};