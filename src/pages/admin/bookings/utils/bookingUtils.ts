import { type Service, type Package } from "../types";
import { getMembershipDiscount } from "@/lib/utils";

export const getTotalPrice = (
  selectedServices: string[],
  selectedPackages: string[],
  services: Service[] | any[],
  packages: Package[] | any[],
  customizedServices: Record<string, string[]> = {}
) => {
  let total = 0;

  // Ensure services and packages are arrays before using .find
  const servicesArray = Array.isArray(services) ? services : [];
  const packagesArray = Array.isArray(packages) ? packages : [];

  // Calculate price for individual services
  selectedServices.forEach((serviceId) => {
    const service = servicesArray.find((s) => s.id === serviceId);
    if (service) {
      total += service.selling_price;
    }
  });

  // Calculate price for packages including customizations
  selectedPackages.forEach((packageId) => {
    const pkg = packagesArray.find((p) => p.id === packageId);
    if (pkg) {
      // Add base package price
      total += pkg.price;

      // Add price for additional customized services
      if (pkg.is_customizable && customizedServices[packageId]) {
        customizedServices[packageId].forEach((serviceId) => {
          const service = servicesArray.find((s) => s.id === serviceId);
          // Only add price if this service is not already in the package
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
    const service = services?.find((s) => s.id === serviceId);
    if (service) {
      totalDuration += service.duration;
    }
  });

  // Calculate duration for packages including customizations
  selectedPackages.forEach((packageId) => {
    const pkg = packages?.find((p) => p.id === packageId);
    if (pkg) {
      // Add durations of all included services
      pkg.package_services?.forEach((ps) => {
        totalDuration += ps.service.duration;
      });

      // Add duration for additional customized services
      if (pkg.is_customizable && customizedServices[packageId]) {
        customizedServices[packageId].forEach((serviceId) => {
          const service = services?.find((s) => s.id === serviceId);
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
  services: Service[] | any[]
) => {
  if (!pkg || !services) return 0;
  
  // Ensure services is an array
  const servicesArray = Array.isArray(services) ? services : [];
  
  // Start with the base package price
  let total = pkg?.price || 0;

  // Add price for additional customized services
  if (pkg?.is_customizable && customizedServices?.length > 0) {
    customizedServices.forEach((serviceId) => {
      // Find the service in the complete list of services
      const service = servicesArray.find((s) => s.id === serviceId);
      
      // Check if this service is not already in the package
      const isInPackage = pkg.package_services?.some(ps => ps.service.id === serviceId);
      
      if (service && !isInPackage) {
        // Use the service's selling price for added customized services
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
  services: Service[] | any[]
) => {
  if (!pkg || !services) return 0;
  
  // Ensure services is an array
  const servicesArray = Array.isArray(services) ? services : [];
  
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
      const service = servicesArray.find((s) => s.id === serviceId);
      
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
  services: Service[] | any[],
  packages: Package[] | any[],
  customizedServices: Record<string, string[]> = {},
  discountType: 'none' | 'percentage' | 'fixed' = 'none',
  discountValue: number = 0,
  membershipDiscount: number = 0,
  couponDiscount: number = 0,
  loyaltyPointsDiscount: number = 0
) => {
  // Ensure services and packages are arrays
  const servicesArray = Array.isArray(services) ? services : [];
  const packagesArray = Array.isArray(packages) ? packages : [];
  
  // Calculate original total price
  const originalTotal = getTotalPrice(selectedServices, selectedPackages, servicesArray, packagesArray, customizedServices);
  
  // Calculate total after manual discount
  const afterManualDiscount = getFinalPrice(originalTotal, discountType, discountValue);
  
  // Calculate total after membership and coupon only (not including loyalty points)
  const priceForServiceAdjustment = Math.max(0, afterManualDiscount - membershipDiscount - couponDiscount);
  
  // If there's no discount at all, return original prices
  if (originalTotal === priceForServiceAdjustment) {
    const result: Record<string, number> = {};
    
    // Just return original prices for all services
    selectedServices.forEach((serviceId) => {
      const service = servicesArray.find((s) => s.id === serviceId);
      if (service) {
        result[serviceId] = service.selling_price;
      }
    });
    
    // Add original prices for package services
    selectedPackages.forEach((packageId) => {
      const pkg = packagesArray.find((p) => p.id === packageId);
      if (pkg) {
        // For services in the package, use package_selling_price if available
        pkg.package_services?.forEach((ps) => {
          const originalServicePrice = ps.package_selling_price !== undefined && ps.package_selling_price !== null
            ? ps.package_selling_price
            : ps.service.selling_price;
            
          result[ps.service.id] = originalServicePrice;
        });
        
        // For customized services not in the base package
        if (pkg.is_customizable && customizedServices[packageId]) {
          customizedServices[packageId].forEach((serviceId) => {
            if (!pkg.package_services?.some(ps => ps.service.id === serviceId)) {
              const service = servicesArray.find((s) => s.id === serviceId);
              if (service) {
                result[serviceId] = service.selling_price;
              }
            }
          });
        }
      }
    });
    
    return result;
  }
  
  // Calculate discount ratio without loyalty points
  const discountRatio = priceForServiceAdjustment / originalTotal;
  const result: Record<string, number> = {};
  
  // Calculate adjusted prices for individual services
  selectedServices.forEach((serviceId) => {
    const service = servicesArray.find((s) => s.id === serviceId);
    if (service) {
      result[serviceId] = service.selling_price * discountRatio;
    }
  });
  
  // Calculate adjusted prices for package services, preserving package discount structure
  selectedPackages.forEach((packageId) => {
    const pkg = packagesArray.find((p) => p.id === packageId);
    if (pkg) {
      // First calculate the original total price of all services in the package WITHOUT the package's own discount
      let originalServicesTotal = 0;
      
      // For base package services, use their original selling price (not the package-specific price)
      if (pkg.package_services && pkg.package_services.length > 0) {
        originalServicesTotal = pkg.package_services.reduce((sum: number, ps: any) => {
          // Always use the original service selling price for this calculation
          return sum + (ps.service.selling_price || 0);
        }, 0);
      }
      
      // Add prices of customized services
      const customServicesTotal = pkg.is_customizable && customizedServices[packageId] ? 
        customizedServices[packageId]
          .filter(serviceId => !pkg.package_services?.some(ps => ps.service.id === serviceId))
          .reduce((sum, serviceId) => {
            const service = servicesArray.find((s) => s.id === serviceId);
            return sum + (service?.selling_price || 0);
          }, 0) : 0;
      
      const totalServicesPrice = originalServicesTotal + customServicesTotal;
      
      // Calculate the package's own discount ratio (how much the package itself discounts services)
      const packagePrice = pkg.price || 0;
      const packageDiscountRatio = totalServicesPrice > 0 ? packagePrice / totalServicesPrice : 1;
      
      // Now apply both the package's own discount and the checkout discount to each service
      pkg.package_services?.forEach((ps) => {
        // Start with the package-specific price if available, otherwise use regular selling price
        const serviceBasePrice = ps.package_selling_price !== undefined && ps.package_selling_price !== null
          ? ps.package_selling_price
          : ps.service.selling_price;
          
        // Apply the checkout discount to the service price 
        result[ps.service.id] = serviceBasePrice * discountRatio;
      });
      
      // Also add the package itself to the result so we can reference it directly
      // Calculate the total adjusted price for all services in the package
      let totalAdjustedPackagePrice = 0;
      
      // Sum up adjusted prices for base package services
      pkg.package_services?.forEach((ps) => {
        totalAdjustedPackagePrice += result[ps.service.id] || 0;
      });
      
      // Handle customized services
      if (pkg.is_customizable && customizedServices[packageId]) {
        customizedServices[packageId].forEach((serviceId) => {
          if (!pkg.package_services?.some(ps => ps.service.id === serviceId)) {
            const service = servicesArray.find((s) => s.id === serviceId);
            if (service) {
              // For additional services, apply both the package discount and checkout discount
              result[serviceId] = service.selling_price * packageDiscountRatio * discountRatio;
              totalAdjustedPackagePrice += result[serviceId];
            }
          }
        });
      }
      
      // Store the total adjusted package price
      result[packageId] = totalAdjustedPackagePrice;
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
