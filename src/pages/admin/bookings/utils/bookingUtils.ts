import { Service, Package } from "../types";

/**
 * Calculate the total price of services and packages
 */
export const getTotalPrice = (
  selectedServices: string[],
  selectedPackages: string[],
  services: Service[],
  packages: Package[],
  customizedServices: Record<string, string[]> = {}
): number => {
  // Calculate services price
  const servicesPrice = selectedServices.reduce((total, serviceId) => {
    const service = services.find((s) => s.id === serviceId);
    return total + (service?.selling_price || 0);
  }, 0);

  // Calculate packages price, including any customized services
  const packagesPrice = selectedPackages.reduce((total, packageId) => {
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) return total;

    let packagePrice = pkg.price || 0;

    // If the package is customizable and has customized services
    if (pkg.is_customizable && customizedServices[packageId]) {
      const additionalServices = customizedServices[packageId].filter(
        serviceId => !pkg.package_services?.some(ps => ps.service.id === serviceId)
      );

      const additionalPrice = additionalServices.reduce((sum, serviceId) => {
        const service = services.find(s => s.id === serviceId);
        return sum + (service?.selling_price || 0);
      }, 0);

      packagePrice += additionalPrice;
    }

    return total + packagePrice;
  }, 0);

  return servicesPrice + packagesPrice;
};

/**
 * Calculate the total duration of selected services and packages
 */
export const getTotalDuration = (
  selectedServices: string[],
  selectedPackages: string[],
  services: Service[],
  packages: Package[],
  customizedServices: Record<string, string[]> = {}
): number => {
  // Calculate services duration
  const servicesDuration = selectedServices.reduce((total, serviceId) => {
    const service = services.find((s) => s.id === serviceId);
    return total + (service?.duration || 0);
  }, 0);

  // Calculate packages duration, including any customized services
  const packagesDuration = selectedPackages.reduce((total, packageId) => {
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) return total;

    // For packages, we calculate the total duration of all services
    const packageServiceIds = pkg.package_services?.map(ps => ps.service.id) || [];
    
    // Add customized services if applicable
    const allServiceIds = [...packageServiceIds];
    if (pkg.is_customizable && customizedServices[packageId]) {
      customizedServices[packageId].forEach(serviceId => {
        if (!allServiceIds.includes(serviceId)) {
          allServiceIds.push(serviceId);
        }
      });
    }

    const packageDuration = allServiceIds.reduce((sum, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      return sum + (service?.duration || 0);
    }, 0);

    return total + packageDuration;
  }, 0);

  return servicesDuration + packagesDuration;
};

/**
 * Calculate the final price after applying discount
 */
export const getFinalPrice = (
  subtotal: number,
  discountType: "none" | "percentage" | "fixed",
  discountValue: number
): number => {
  if (discountType === "none" || discountValue <= 0) {
    return subtotal;
  }

  if (discountType === "percentage") {
    const discountAmount = (subtotal * discountValue) / 100;
    return subtotal - discountAmount;
  }

  if (discountType === "fixed") {
    return Math.max(0, subtotal - discountValue);
  }

  return subtotal;
};

/**
 * Get the price of a service when it's part of a package
 */
export const getServicePriceInPackage = (
  packageService: any,
  defaultPrice: number
): number => {
  // Check if package_selling_price exists and is a number
  if (
    packageService && 
    typeof packageService.package_selling_price === 'number'
  ) {
    return packageService.package_selling_price;
  }
  
  // Otherwise, use the default price
  return defaultPrice;
};

/**
 * Calculate the total price of a package, including custom services
 */
export const calculatePackagePrice = (
  pkg: Package,
  customServices: string[] = [],
  services: Service[] = []
): number => {
  if (!pkg) return 0;
  
  // Start with the base package price
  let totalPrice = pkg.price || 0;
  
  // If the package is customizable and has custom services
  if (pkg.is_customizable && customServices.length > 0) {
    // Find services that are not already part of the package
    const additionalServices = customServices.filter(
      serviceId => 
        !pkg.package_services?.some(ps => ps.service.id === serviceId)
    );
    
    // Calculate additional price
    const additionalPrice = additionalServices.reduce((sum, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      return sum + (service?.selling_price || 0);
    }, 0);
    
    // Add to the total
    totalPrice += additionalPrice;
  }
  
  return totalPrice;
};
