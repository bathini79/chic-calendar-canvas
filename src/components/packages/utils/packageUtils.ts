
export const calculatePackagePrice = (
  selectedServices: string[],
  services: Array<{ id: string; selling_price: number }>,
  discountType: 'none' | 'percentage' | 'fixed',
  discountValue: number
): number => {
  const subtotal = selectedServices.reduce((total, serviceId) => {
    const service = services.find(s => s.id === serviceId);
    return total + (service?.selling_price || 0);
  }, 0);

  if (discountType === 'percentage') {
    return Math.max(0, subtotal * (1 - discountValue / 100));
  } else if (discountType === 'fixed') {
    return Math.max(0, subtotal - discountValue);
  }
  return subtotal;
};
