
import { type Service, type Package } from "../types";

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
    const service = services?.find((s) => s.id === serviceId);
    if (service) {
      total += service.selling_price;
    }
  });

  // Calculate price for packages including customizations
  selectedPackages.forEach((packageId) => {
    const pkg = packages?.find((p) => p.id === packageId);
    if (pkg) {
      // Add base package price
      total += pkg.price;

      // Add price for additional customized services
      if (pkg.is_customizable && customizedServices[packageId]) {
        customizedServices[packageId].forEach((serviceId) => {
          const service = services?.find((s) => s.id === serviceId);
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
    default:
      return "bg-purple-100 hover:bg-purple-200 border-purple-300";
  }
};

export const calculatePackagePrice = (
  pkg: Package,
  customizedServices: string[],
  services: Service[]
) => {
  let total = pkg.price || 0;

  // Add price for additional customized services
  if (pkg.is_customizable && customizedServices?.length > 0) {
    customizedServices.forEach((serviceId) => {
      const service = services?.find((s) => s.id === serviceId);
      if (service && !pkg.package_services?.some(ps => ps.service.id === serviceId)) {
        total += service.selling_price;
      }
    });
  }

  return total;
};

export const calculatePackageDuration = (
  pkg: Package,
  customizedServices: string[],
  services: Service[]
) => {
  let duration = 0;

  // Add duration for package services
  pkg.package_services?.forEach((ps) => {
    duration += ps.service.duration;
  });

  // Add duration for additional customized services
  if (pkg.is_customizable && customizedServices?.length > 0) {
    customizedServices.forEach((serviceId) => {
      const service = services?.find((s) => s.id === serviceId);
      if (service && !pkg.package_services?.some(ps => ps.service.id === serviceId)) {
        duration += service.duration;
      }
    });
  }

  return duration;
};
