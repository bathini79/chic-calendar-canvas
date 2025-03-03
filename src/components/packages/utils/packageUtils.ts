/**
 * Utility functions for package-related operations
 */

/**
 * Calculate the total price of a package including its services
 */
export const calculatePackagePrice = (
  packageData: any,
  customServices: string[] = [],
  allServices: any[] = []
): number => {
  if (!packageData) return 0;
  
  // Start with the base package price
  let totalPrice = packageData.price || 0;
  
  // If there are customized services, add their prices
  if (customServices.length > 0 && allServices.length > 0) {
    // Only include services that are not already part of the package
    const additionalServices = customServices.filter(
      serviceId => 
        !packageData.package_services?.some(
          (ps: any) => ps.service.id === serviceId
        )
    );
    
    // Calculate additional services price
    const additionalPrice = additionalServices.reduce((sum, serviceId) => {
      const service = allServices.find(s => s.id === serviceId);
      return sum + (service?.selling_price || 0);
    }, 0);
    
    totalPrice += additionalPrice;
  }
  
  return totalPrice;
};

/**
 * Get the price of a service when it's part of a package
 */
export const getServicePriceInPackage = (
  packageService: any,
  defaultPrice: number
): number => {
  // If package_selling_price is defined and is a number, use it
  if (
    packageService && 
    typeof packageService.package_selling_price === 'number'
  ) {
    return packageService.package_selling_price;
  }
  
  // Otherwise, fallback to the default price
  return defaultPrice;
};
