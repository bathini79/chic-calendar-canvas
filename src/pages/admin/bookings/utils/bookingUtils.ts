import { type Service, type Package } from "../types";
import { getMembershipDiscount } from "@/lib/utils";

export const getTotalPrice = (
  selectedServices: string[],
  selectedPackages: string[],
  services: Service[],
  packages: Package[],
  customizedServices: Record<string, string[]> = {}
) => {
  let total = 0;

  // Calculate price for individual services
  selectedServices.forEach((serviceId) => {
    const service = Array.isArray(services) ? services.find((s) => s.id === serviceId) : null;
    if (service) {
      total += service.selling_price;
    }
  });

  // Calculate price for packages including customizations
  selectedPackages.forEach((packageId) => {
    const pkg = Array.isArray(packages) ? packages.find((p) => p.id === packageId) : null;
    if (pkg) {
      // Add base package price
      total += pkg.price;

      // Add price for additional customized services
      if (pkg.is_customizable && customizedServices[packageId]) {
        customizedServices[packageId].forEach((serviceId) => {
          const service = Array.isArray(services) ? services.find((s) => s.id === serviceId) : null;
          if (service && !pkg.package_services?.some(ps => ps.service.id === serviceId)) {
            total += service.selling_price;
          }
        });
      }
    }
  });

  return total;
};

export const getTotalDuration = (
  selectedServices: string[],
  selectedPackages: string[],
  services: Service[],
  packages: Package[],
  customizedServices: Record<string, string[]> = {}
) => {
  let totalDuration = 0;

  // Calculate duration for individual services
  selectedServices.forEach((serviceId) => {
    const service = Array.isArray(services) ? services.find((s) => s.id === serviceId) : null;
    if (service) {
      totalDuration += service.duration;
    }
  });

  // Calculate duration for packages including customizations
  selectedPackages.forEach((packageId) => {
    const pkg = Array.isArray(packages) ? packages.find((p) => p.id === packageId) : null;
    if (pkg) {
      // Add durations of all included services
      pkg.package_services?.forEach((ps) => {
        totalDuration += ps.service.duration;
      });

      // Add duration for additional customized services
      if (pkg.is_customizable && customizedServices[packageId]) {
        customizedServices[packageId].forEach((serviceId) => {
          const service = Array.isArray(services) ? services.find((s) => s.id === serviceId) : null;
          if (service && !pkg.package_services?.some(ps => ps.service.id === serviceId)) {
            totalDuration += service.duration;
          }
        });
      }
    }
  });

  return totalDuration;
};

export const getFinalPrice = (
  totalPrice: number,
  discountType: 'none' | 'percentage' | 'fixed',
  discountValue: number
) => {
  if (discountType === 'percentage') {
    return totalPrice * (1 - (discountValue / 100));
  }
  return Math.max(0, totalPrice - (discountType === 'fixed' ? discountValue : 0));
};

export const getAppointmentStatusColor = (status: string) => {
  switch (status) {
    case "confirmed":
      return "bg-green-100 hover:bg-green-200 border-green-300";
    case "canceled":
      return "bg-red-100 hover:bg-red-200 border-red-300";
    case "noshow":
    case "no-show":
      return "bg-red-100 hover:bg-red-200 border-red-300 text-red-700";
    case "completed":
      return "bg-blue-100 hover:bg-blue-200 border-blue-300";
    case "inprogress":
      return "bg-yellow-100 hover:bg-yellow-200 border-yellow-300";
    default:
      return "bg-purple-100 hover:bg-purple-200 border-purple-300";
  }
};

export const calculatePackagePrice = (
  pkg: Package,
  customizedServices: string[],
  services: Service[]
) => {
  if (!pkg || !Array.isArray(services)) return 0;
  
  let total = pkg?.price || 0;

  // Add price for additional customized services
  if (pkg?.is_customizable && customizedServices?.length > 0) {
    customizedServices.forEach((serviceId) => {
      // Find the service in the complete list of services
      const service = services.find((s) => s.id === serviceId);
      
      // Check if this service is not already in the package
      const isInPackage = pkg.package_services?.some(ps => ps.service.id === serviceId);
      
      if (service && !isInPackage) {
        total += service.selling_price;
      }
    });
  }

  return total;
};

export const getServicePriceInPackage = (
  serviceId: string,
  packageId: string | null,
  packages: Package[],
  services: Service[]
) => {
  // If there's no package context, return the regular service price
  if (!packageId) {
    const service = services?.find(s => s.id === serviceId);
    return service?.selling_price || 0;
  }

  // Find the package
  const pkg = packages?.find(p => p.id === packageId);
  if (!pkg) {
    const service = services?.find(s => s.id === serviceId);
    return service?.selling_price || 0;
  }

  // Check if the service is part of the package
  const packageService = pkg.package_services?.find(ps => ps.service.id === serviceId);
  if (packageService) {
    // Use package_selling_price if available, otherwise fall back to service's selling_price
    return packageService.package_selling_price !== undefined && packageService.package_selling_price !== null
      ? packageService.package_selling_price
      : packageService.service.selling_price;
  }

  // If it's a customized service not in the base package
  const service = services?.find(s => s.id === serviceId);
  return service?.selling_price || 0;
};

export const calculatePackageDuration = (
  pkg: Package,
  customizedServices: string[],
  services: Service[]
) => {
  if (!pkg || !Array.isArray(services)) return 0;
  
  // Initialize duration with the sum of all package service durations
  let duration = 0;
  
  // Add duration for all package services
  if (pkg.package_services && pkg.package_services.length > 0) {
    pkg.package_services.forEach((ps) => {
      if (ps.service && typeof ps.service.duration === 'number') {
        duration += ps.service.duration;
      }
    });
  }

  // Add duration for additional customized services
  if (pkg?.is_customizable && customizedServices?.length > 0) {
    customizedServices.forEach((serviceId) => {
      // Find the service in the complete list of services
      const service = services.find((s) => s.id === serviceId);
      
      // Check if this service is not already in the package
      const isInPackage = pkg.package_services?.some(ps => ps.service.id === serviceId);
      
      if (service && !isInPackage && typeof service.duration === 'number') {
        duration += service.duration;
      }
    });
  }

  return duration;
};

export const calculateAdjustedPrice = (
  originalPrice: number,
  totalPrice: number,
  discountedTotalPrice: number
) => {
  if (totalPrice === 0) return originalPrice;
  // Calculate discount percentage based on total values
  const discountRatio = discountedTotalPrice / totalPrice;
  // Apply the same discount ratio to the individual price
  return originalPrice * discountRatio;
};

export const getAdjustedServicePrices = (
  selectedServices: string[],
  selectedPackages: string[],
  services: Service[],
  packages: Package[],
  customizedServices: Record<string, string[]> = {},
  discountType: 'none' | 'percentage' | 'fixed' = 'none',
  discountValue: number = 0,
  membershipDiscount: number = 0,
  couponDiscount: number = 0
) => {
  // Calculate original total price
  const originalTotal = getTotalPrice(selectedServices, selectedPackages, services, packages, customizedServices);
  
  // Calculate total after manual discount
  const afterManualDiscount = getFinalPrice(originalTotal, discountType, discountValue);
  
  // Calculate final total after all discounts
  const finalTotal = Math.max(0, afterManualDiscount - membershipDiscount - couponDiscount);
  
  // Prepare result object for all services and package services
  const result: Record<string, number> = {};
  
  // Calculate adjusted prices for individual services
  selectedServices.forEach((serviceId) => {
    const service = services?.find((s) => s.id === serviceId);
    if (service) {
      result[serviceId] = calculateAdjustedPrice(
        service.selling_price,
        originalTotal,
        finalTotal
      );
    }
  });
  
  // Calculate adjusted prices for package services
  selectedPackages.forEach((packageId) => {
    const pkg = packages?.find((p) => p.id === packageId);
    if (pkg) {
      // First handle the base package
      pkg.package_services?.forEach((ps) => {
        // Use package_selling_price if available, otherwise service's selling_price
        const originalServicePrice = ps.package_selling_price !== undefined && ps.package_selling_price !== null
          ? ps.package_selling_price
          : ps.service.selling_price;
          
        result[ps.service.id] = calculateAdjustedPrice(
          originalServicePrice,
          originalTotal,
          finalTotal
        );
      });
      
      // Then handle customized services
      if (pkg.is_customizable && customizedServices[packageId]) {
        customizedServices[packageId].forEach((serviceId) => {
          // Skip if already in package
          if (pkg.package_services?.some(ps => ps.service.id === serviceId)) {
            return;
          }
          
          const service = services?.find((s) => s.id === serviceId);
          if (service) {
            result[serviceId] = calculateAdjustedPrice(
              service.selling_price,
              originalTotal,
              finalTotal
            );
          }
        });
      }
    }
  });
  
  return result;
};

export const getPriceWithDiscount = (
  originalPrice: number,
  discountType: 'none' | 'percentage' | 'fixed',
  discountValue: number
): number => {
  if (discountType === 'none' || !discountValue) {
    return originalPrice;
  }
  
  if (discountType === 'percentage') {
    return originalPrice * (1 - (discountValue / 100));
  }
  
  if (discountType === 'fixed') {
    return Math.max(0, originalPrice - discountValue);
  }
  
  return originalPrice;
};
