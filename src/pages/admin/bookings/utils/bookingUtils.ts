import type { Service, Package } from "../types";

export const getTotalPrice = (
  selectedServices: string[],
  selectedPackages: string[],
  services: Service[],
  packages: Package[],
  customizedServices: Record<string, string[]>
): number => {
  let totalPrice = 0;

  // Calculate total price for selected services
  selectedServices.forEach((serviceId) => {
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      totalPrice += service.selling_price;
    }
  });

  selectedPackages.forEach((packageId) => {
    const pkg = packages.find((p) => p.id === packageId);
    if (pkg) {
      totalPrice += calculatePackagePrice(pkg, customizedServices[packageId] || [], services);
    }
  });

  return totalPrice;
};

export const getTotalDuration = (
  selectedServices: string[],
  selectedPackages: string[],
  services: Service[],
  packages: Package[],
  customizedServices: Record<string, string[]>
): number => {
  let totalDuration = 0;

  // Calculate total duration for selected services
  selectedServices.forEach((serviceId) => {
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      totalDuration += service.duration;
    }
  });

  selectedPackages.forEach((packageId) => {
    const pkg = packages.find((p) => p.id === packageId);
    if (pkg) {
      totalDuration += calculatePackageDuration(pkg, customizedServices[packageId] || [], services);
    }
  });

  return totalDuration;
};

export const getFinalPrice = (
  totalPrice: number,
  discountType: "none" | "fixed" | "percentage",
  discountValue: number
): number => {
  let finalPrice = totalPrice;

  if (discountType === "percentage") {
    finalPrice = totalPrice - (totalPrice * discountValue) / 100;
  } else if (discountType === "fixed") {
    finalPrice = totalPrice - discountValue;
  }

  return Math.max(0, finalPrice); // Ensure the final price is not negative
};

export const calculatePackagePrice = (
  pkg: Package,
  customizedServices: string[],
  services: Service[]
): number => {
  let packagePrice = pkg.price || 0;

  if (pkg.package_services) {
    packagePrice = pkg.package_services.reduce((acc, ps) => {
      const adjustedPrice = ps.package_selling_price !== undefined && ps.package_selling_price !== null
        ? ps.package_selling_price 
        : ps.service.selling_price;
      return acc + adjustedPrice;
    }, 0);
  }
  
  if (customizedServices && customizedServices.length > 0) {
    customizedServices.forEach(serviceId => {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        packagePrice += service.selling_price;
      }
    });
  }

  return packagePrice;
};

export const calculatePackageDuration = (
  pkg: Package,
  customizedServices: string[],
  services: Service[]
): number => {
  let packageDuration = pkg.duration || 0;

  if (pkg.package_services) {
    packageDuration = pkg.package_services.reduce((acc, ps) => acc + ps.service.duration, 0);
  }

  if (customizedServices && customizedServices.length > 0) {
    customizedServices.forEach(serviceId => {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        packageDuration += service.duration;
      }
    });
  }

  return packageDuration;
};

export const getServicePriceInPackage = (
    pkg: Package,
    serviceId: string
): number | undefined => {
    const packageService = pkg.package_services?.find(ps => ps.service.id === serviceId);
    return packageService?.package_selling_price !== undefined
        ? packageService?.package_selling_price
        : packageService?.service.selling_price;
};

// Add getApplicableMembershipDiscount function 
export const getApplicableMembershipDiscount = (
  customerMemberships: any[],
  serviceId: string | null,
  packageId: string | null,
  amount: number
) => {
  if (!serviceId && !packageId) return null;
  if (!customerMemberships || customerMemberships.length === 0) return null;
  
  // Find all applicable memberships for this service or package
  const applicableMemberships = customerMemberships.filter(membership => {
    const mem = membership.membership;
    if (!mem) return false;
    
    // Check if service/package is in the applicable list
    const isApplicable = 
      (serviceId && mem.applicable_services && mem.applicable_services.includes(serviceId)) ||
      (packageId && mem.applicable_packages && mem.applicable_packages.includes(packageId));
    
    // Check minimum billing amount if set
    const meetsMinBilling = !mem.min_billing_amount || 
      amount >= mem.min_billing_amount;
      
    return isApplicable && meetsMinBilling;
  });
  
  if (applicableMemberships.length === 0) return null;
  
  // Get the best discount
  let bestDiscount = 0;
  let bestMembership = null;
  
  applicableMemberships.forEach(membership => {
    const mem = membership.membership;
    if (!mem) return;
    
    let discountAmount = 0;
    
    if (mem.discount_type === 'percentage') {
      discountAmount = amount * (mem.discount_value / 100);
      
      // Apply max discount cap if exists
      if (mem.max_discount_value) {
        discountAmount = Math.min(discountAmount, mem.max_discount_value);
      }
    } else {
      discountAmount = Math.min(mem.discount_value, amount);
    }
    
    if (discountAmount > bestDiscount) {
      bestDiscount = discountAmount;
      bestMembership = membership;
    }
  });
  
  if (!bestMembership) return null;
  
  return {
    membershipId: bestMembership.membership_id,
    membershipName: bestMembership.membership.name,
    discountType: bestMembership.membership.discount_type,
    discountValue: bestMembership.membership.discount_value,
    calculatedDiscount: bestDiscount
  };
};
