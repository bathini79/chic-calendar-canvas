export const getTotalPrice = (
  selectedServices: string[],
  selectedPackages: string[],
  services: any[],
  packages: any[],
  customizedServices: Record<string, string[]>
): number => {
  let total = 0;

  // Add service prices
  for (const serviceId of selectedServices) {
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      total += service.selling_price;
    }
  }

  // Add package prices and any customized services within those packages
  for (const packageId of selectedPackages) {
    const pkg = packages.find((p) => p.id === packageId);
    if (pkg) {
      // Add base package price
      total += pkg.price;

      // Add prices for any customized services selected for this package
      const customServiceIds = customizedServices[packageId] || [];
      for (const serviceId of customServiceIds) {
        const service = services.find((s) => s.id === serviceId);
        if (service) {
          total += service.selling_price;
        }
      }
    }
  }

  return total;
};

export const getTotalDuration = (
  selectedServices: string[],
  selectedPackages: string[],
  services: any[],
  packages: any[],
  customizedServices: Record<string, string[]>
): number => {
  let total = 0;

  // Add service durations
  for (const serviceId of selectedServices) {
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      total += service.duration;
    }
  }

  // Add package durations
  for (const packageId of selectedPackages) {
    const pkg = packages.find((p) => p.id === packageId);
    if (pkg) {
      // Add base package duration
      total += pkg.duration;

      // We don't add duration for customized services as they're performed 
      // within the same package appointment time slot
    }
  }

  return total;
};

// Calculate price after discount
export const getPriceWithDiscount = (
  basePrice: number,
  discountType: string,
  discountValue: number
): number => {
  if (discountType === 'percentage' && discountValue > 0) {
    return basePrice * (1 - discountValue / 100);
  } else if (discountType === 'fixed' && discountValue > 0) {
    return Math.max(0, basePrice - discountValue);
  }
  return basePrice;
};
