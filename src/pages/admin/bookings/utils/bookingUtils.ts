
import type { Service, Package } from "../types";

export const getTotalDuration = (
  selectedServices: string[],
  selectedPackages: string[],
  services: Service[],
  packages: Package[],
  customizedServices: Record<string, string[]> = {}
): number => {
  let totalDuration = 0;

  // Add duration for individual services
  selectedServices.forEach(serviceId => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      totalDuration += service.duration || 0;
    }
  });

  // Add duration for packages
  selectedPackages.forEach(packageId => {
    const pkg = packages.find(p => p.id === packageId);
    if (pkg) {
      if (pkg.duration) {
        // Use package duration directly if defined
        totalDuration += pkg.duration;
      } else if (pkg.package_services) {
        // Calculate total duration from included services
        pkg.package_services.forEach(ps => {
          totalDuration += ps.service.duration || 0;
        });
      }

      // Add duration for custom services added to the package
      if (customizedServices[packageId]) {
        customizedServices[packageId].forEach(serviceId => {
          // Check if it's not already counted in package_services
          const isBaseService = pkg.package_services.some(ps => ps.service.id === serviceId);
          if (!isBaseService) {
            const service = services.find(s => s.id === serviceId);
            if (service) {
              totalDuration += service.duration || 0;
            }
          }
        });
      }
    }
  });

  return totalDuration;
};

export const calculatePackagePrice = (
  pkg: Package,
  customServiceIds: string[] = [],
  services: Service[]
): number => {
  let packagePrice = pkg.price || 0;
  
  // Add additional services that aren't part of the base package
  customServiceIds.forEach(serviceId => {
    const isBaseService = pkg.package_services?.some(ps => ps.service.id === serviceId);
    if (!isBaseService) {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        packagePrice += service.selling_price || 0;
      }
    }
  });
  
  return packagePrice;
};

export const getServicePriceInPackage = (
  serviceId: string,
  packageId: string,
  packages: Package[]
): number => {
  const pkg = packages.find(p => p.id === packageId);
  if (!pkg) return 0;
  
  const packageService = pkg.package_services?.find(ps => ps.service.id === serviceId);
  if (!packageService) return 0;
  
  return packageService.package_selling_price !== undefined && 
         packageService.package_selling_price !== null
    ? packageService.package_selling_price
    : packageService.service.selling_price || 0;
};

export const getTotalPrice = (
  selectedServices: string[],
  selectedPackages: string[],
  services: Service[],
  packages: Package[],
  customizedServices: Record<string, string[]> = {},
  discountType: string = 'none',
  discountValue: number = 0,
  membershipEligibleServices: string[] = [],
  membershipEligiblePackages: string[] = []
): number => {
  let totalPrice = 0;
  
  // Add prices for individual services
  selectedServices.forEach(serviceId => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      totalPrice += service.selling_price || 0;
    }
  });
  
  // Add prices for packages
  selectedPackages.forEach(packageId => {
    totalPrice += calculatePackagePrice(
      packages.find(p => p.id === packageId) as Package,
      customizedServices[packageId] || [],
      services
    );
  });
  
  // Return total if no discount
  if (discountType === 'none' || discountValue <= 0) {
    return totalPrice;
  }
  
  // Handling membership discounts with eligible services/packages
  const hasMembershipRestrictions = 
    membershipEligibleServices.length > 0 || membershipEligiblePackages.length > 0;
    
  if (hasMembershipRestrictions) {
    // Calculate eligible portion
    let eligibleAmount = 0;
    
    // Add eligible service prices
    selectedServices.forEach(serviceId => {
      const service = services.find(s => s.id === serviceId);
      const isEligible = membershipEligibleServices.includes(serviceId);
      
      if (service && isEligible) {
        eligibleAmount += service.selling_price || 0;
      }
    });
    
    // Add eligible package prices
    selectedPackages.forEach(packageId => {
      const isEligible = membershipEligiblePackages.includes(packageId);
      
      if (isEligible) {
        eligibleAmount += calculatePackagePrice(
          packages.find(p => p.id === packageId) as Package,
          customizedServices[packageId] || [],
          services
        );
      }
    });
    
    // Calculate discount on eligible amount only
    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = (eligibleAmount * discountValue) / 100;
    } else if (discountType === 'fixed') {
      discountAmount = Math.min(discountValue, eligibleAmount);
    }
    
    // Subtract discount from total
    return totalPrice - discountAmount;
  }
  
  // Apply discount to full amount if no restrictions
  return getFinalPrice(totalPrice, discountType, discountValue);
};

export const getFinalPrice = (
  totalPrice: number,
  discountType: string,
  discountValue: number
): number => {
  if (discountType === 'none' || discountValue <= 0) {
    return totalPrice;
  }
  
  if (discountType === 'percentage') {
    const discountAmount = (totalPrice * discountValue) / 100;
    return totalPrice - discountAmount;
  }
  
  if (discountType === 'fixed') {
    return Math.max(0, totalPrice - discountValue);
  }
  
  return totalPrice;
};
