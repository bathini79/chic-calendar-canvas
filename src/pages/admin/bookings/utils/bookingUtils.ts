
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
