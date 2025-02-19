
import { type Service, type Package } from "../types";

export const getTotalPrice = (
  selectedServices: string[],
  selectedPackages: string[],
  services: Service[],
  packages: Package[]
) => {
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

export const getTotalDuration = (
  selectedServices: string[],
  selectedPackages: string[],
  services: Service[],
  packages: Package[]
) => {
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
