type DiscountType = 'none' | 'percentage' | 'fixed';

interface Service {
  id: string;
  selling_price: number;
}

export const calculatePackagePrice = (
  selectedServices: string[],
  services: Service[],
  discountType: DiscountType,
  discountValue: number
): number => {
  const basePrice = selectedServices.reduce((total, serviceId) => {
    const service = services.find(s => s.id === serviceId);
    return total + (service?.selling_price || 0);
  }, 0);

  let finalPrice = basePrice;

  if (discountType === 'percentage') {
    finalPrice = basePrice * (1 - (discountValue / 100));
  } else if (discountType === 'fixed') {
    finalPrice = basePrice - discountValue;
  }

  return Math.max(0, finalPrice);
};