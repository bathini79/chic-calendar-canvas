
/**
 * Calculate the package price based on selected services, discount type and value
 */
export const calculatePackagePrice = (
  selectedServices: string[],
  services: Array<{ id: string; selling_price: number }>,
  discountType: 'none' | 'percentage' | 'fixed',
  discountValue: number
): number => {
  // Calculate base price without discount
  const basePrice = selectedServices.reduce((total, serviceId) => {
    const service = services.find(s => s.id === serviceId);
    return total + (service?.selling_price || 0);
  }, 0);

  // Apply discount
  if (discountType === 'percentage' && discountValue > 0) {
    return basePrice * (1 - discountValue / 100);
  } else if (discountType === 'fixed' && discountValue > 0) {
    return Math.max(0, basePrice - discountValue);
  }

  return basePrice;
};
