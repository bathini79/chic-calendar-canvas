
import { Service, Package } from '../types';

export const calculateTotal = (
  selectedServices: string[],
  selectedPackages: string[],
  services: Service[],
  packages: Package[],
  customizedServices: Record<string, string[]> = {}
): number => {
  let total = 0;

  // Add up service prices
  selectedServices.forEach(serviceId => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      total += service.selling_price;
    }
  });

  // Add up package prices and any customized service additions
  selectedPackages.forEach(packageId => {
    const pkg = packages.find(p => p.id === packageId);
    if (pkg) {
      total += pkg.price;

      // Add prices for any customized services added to this package
      if (customizedServices[packageId] && customizedServices[packageId].length > 0) {
        customizedServices[packageId].forEach(serviceId => {
          const service = services.find(s => s.id === serviceId);
          if (service) {
            total += service.selling_price;
          }
        });
      }
    }
  });

  return total;
};

export const calculateDuration = (
  selectedServices: string[],
  selectedPackages: string[],
  services: Service[],
  packages: Package[],
  customizedServices: Record<string, string[]> = {}
): number => {
  let totalDuration = 0;

  // Add up service durations
  selectedServices.forEach(serviceId => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      totalDuration += service.duration;
    }
  });

  // Add up package durations and any customized service additions
  selectedPackages.forEach(packageId => {
    const pkg = packages.find(p => p.id === packageId);
    if (pkg && pkg.duration) {
      totalDuration += pkg.duration;

      // Add durations for any customized services added to this package
      if (customizedServices[packageId] && customizedServices[packageId].length > 0) {
        customizedServices[packageId].forEach(serviceId => {
          const service = services.find(s => s.id === serviceId);
          if (service) {
            totalDuration += service.duration;
          }
        });
      }
    }
  });

  return totalDuration;
};

// Additional utility functions needed by other components

export const calculatePackagePrice = (
  pkg: Package,
  additionalServices: string[] = [],
  services: Service[]
): number => {
  let total = pkg.price;

  // Add prices for any additional services
  additionalServices.forEach(serviceId => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      total += service.selling_price;
    }
  });

  return total;
};

export const calculatePackageDuration = (
  pkg: Package,
  additionalServices: string[] = [],
  services: Service[]
): number => {
  let duration = pkg.duration || 0;

  // Add durations for any additional services
  additionalServices.forEach(serviceId => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      duration += service.duration;
    }
  });

  return duration;
};

// Utility functions for checkout section
export const getTotalPrice = calculateTotal;
export const getTotalDuration = calculateDuration;

export const getFinalPrice = (
  subtotal: number,
  discountType: 'none' | 'fixed' | 'percentage' | string,
  discountValue: number
): number => {
  if (discountType === 'fixed') {
    return Math.max(0, subtotal - discountValue);
  } else if (discountType === 'percentage') {
    return subtotal * (1 - discountValue / 100);
  }
  return subtotal;
};

export const getServicePriceInPackage = (
  serviceId: string,
  packageId: string,
  packages: Package[],
  services: Service[]
): number => {
  const pkg = packages.find(p => p.id === packageId);
  if (!pkg || !pkg.package_services) return 0;

  const packageService = pkg.package_services.find(ps => ps.service.id === serviceId);
  if (packageService?.package_selling_price !== undefined) {
    return packageService.package_selling_price;
  }

  const service = services.find(s => s.id === serviceId);
  return service ? service.selling_price : 0;
};
