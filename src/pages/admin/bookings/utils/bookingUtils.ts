
import { addMinutes } from "date-fns";

export const START_HOUR = 8;
export const END_HOUR = 20;
export const TOTAL_HOURS = END_HOUR - START_HOUR;
export const PIXELS_PER_HOUR = 60;

export const getTotalPrice = (selectedServices: string[], selectedPackages: string[], services: any[], packages: any[]) => {
  let total = 0;

  selectedServices.forEach((serviceId) => {
    const service = services?.find((s) => s.id === serviceId);
    if (service) {
      total += service.selling_price;
    }
  });

  selectedPackages.forEach((packageId) => {
    const pkg = packages?.find((p) => p.id === packageId);
    if (pkg) {
      total += pkg.price;
    }
  });

  return total;
};

export const getTotalDuration = (selectedServices: string[], selectedPackages: string[], services: any[], packages: any[]) => {
  let totalDuration = 0;

  selectedServices.forEach((serviceId) => {
    const service = services?.find((s) => s.id === serviceId);
    if (service) {
      totalDuration += service.duration;
    }
  });

  selectedPackages.forEach((packageId) => {
    const pkg = packages?.find((p) => p.id === packageId);
    if (pkg) {
      totalDuration += pkg.duration;
    }
  });

  return totalDuration;
};

export const getFinalPrice = (totalPrice: number, discountType: 'none' | 'percentage' | 'fixed', discountValue: number) => {
  if (discountType === 'percentage') {
    return totalPrice * (1 - (discountValue / 100));
  }
  return Math.max(0, totalPrice - (discountType === 'fixed' ? discountValue : 0));
};
