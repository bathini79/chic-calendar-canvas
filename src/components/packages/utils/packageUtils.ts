
import { calculatePackagePrice, calculatePackageDuration } from "@/pages/admin/bookings/utils/bookingUtils";

// Re-export the utility functions from bookingUtils.ts
export { calculatePackagePrice, calculatePackageDuration };

// Get customized package services
export const getPackageServices = (packageId: string, packages: any[], customizedServices: string[]) => {
  const pkg = packages.find(p => p.id === packageId);
  if (!pkg) return [];
  
  // Get all included services
  const packageServices = pkg.package_services || [];
  
  // Add any customized services if this package is customizable
  const customServices = pkg.is_customizable && customizedServices ? 
    customizedServices.filter(serviceId => 
      !packageServices.some((ps: any) => ps.service.id === serviceId)
    ) : [];
  
  return {
    baseServices: packageServices.map((ps: any) => ps.service),
    customServices
  };
};
