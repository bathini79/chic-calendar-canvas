import { useMemo } from 'react';
import type { Service, Package } from '../types';
import { getTotalDuration, calculatePackagePrice, getServicePriceInPackage } from '../utils/bookingUtils';

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  adjustedPrice: number;
  duration: number;
  type: "service";
  packageId: string | null;
  stylist: string;
  stylistName: string;
  time: string;
  formattedDuration: string;
}

interface PackageItem {
  id: string;
  name: string;
  price: number;
  adjustedPrice: number;
  duration: number;
  type: "package";
  packageId: string | null;
  stylist: string;
  stylistName: string;
  time: string;
  formattedDuration: string;
  services: Array<{
    id: string;
    name: string;
    price: number;
    adjustedPrice: number;
    duration: number;
    stylist: string;
    stylistName: string;
    time: string;
    isCustomized: boolean;
  }>;
}

type CheckoutItem = ServiceItem | PackageItem;

interface UseSelectedItemsInCheckoutProps {
  selectedServices: string[];
  selectedPackages: string[];
  services: Service[];
  packages: Package[];
  selectedStylists: Record<string, string>;
  selectedTimeSlots: Record<string, string>;
  appointmentId?: string;
  customizedServices: Record<string, string[]>;
  getServiceDisplayPrice: (serviceId: string) => number;
  getStylistName: (stylistId: string) => string | null;
  formatDuration: (minutes: number) => string;
}

export const useSelectedItemsInCheckout = ({
  selectedServices,
  selectedPackages,
  services,
  packages,
  selectedStylists,
  selectedTimeSlots,
  appointmentId,
  customizedServices,
  getServiceDisplayPrice,
  getStylistName,
  formatDuration,
}: UseSelectedItemsInCheckoutProps) => {
  const selectedItems = useMemo(() => {
    const items = [
      ...selectedServices.map((serviceId) => {
        const service = services?.find((s) => s.id === serviceId);
        if (!service) return null;

        return {
          id: serviceId,
          name: service.name,
          price: service.selling_price,
          adjustedPrice: getServiceDisplayPrice(serviceId),
          duration: service.duration,
          type: "service" as const,
          packageId: null as string | null,
          stylist: selectedStylists[serviceId] || "",
          stylistName: selectedStylists[serviceId] ? getStylistName(selectedStylists[serviceId]) : "",
          time: selectedTimeSlots[serviceId] || "",
          formattedDuration: formatDuration(service.duration)
        };
      }),
      ...selectedPackages.map((packageId) => {
        const pkg = packages?.find((p) => p.id === packageId);
        if (!pkg) return null;
        
        // Calculate original package base price (without adjustments)
        const originalPackagePrice = calculatePackagePrice(pkg, customizedServices[packageId] || [], services);

        // Prepare array for package services (both included and customized)
        const packageServices = [];
        
        // First collect the base package services with their correct pricing
        if (pkg.package_services && pkg.package_services.length > 0) {
          packageServices.push(...pkg.package_services.map(ps => {
            // Get the proper price for this service within the package context
            const packageSpecificPrice = ps.package_selling_price !== undefined && ps.package_selling_price !== null
              ? ps.package_selling_price
              : ps.service.selling_price;
            
            // Get the adjusted price after discounts, memberships, etc.
            const adjustedServicePrice = getServiceDisplayPrice(ps.service.id);
            
            return {
              id: ps.service.id,
              name: ps.service.name,
              price: packageSpecificPrice, // Use package-specific price
              adjustedPrice: adjustedServicePrice,
              duration: ps.service.duration,
              stylist: selectedStylists[ps.service.id] || "",
              stylistName: selectedStylists[ps.service.id] ? getStylistName(selectedStylists[ps.service.id]) : "",
              time: selectedTimeSlots[ps.service.id] || "",
              isCustomized: false
            };
          }));
        }

        // Then add any customized services that aren't already in the package
        if (pkg.is_customizable && customizedServices[packageId]) {
          const additionalServices = customizedServices[packageId]
            .filter(serviceId => !pkg.package_services?.some(ps => ps.service.id === serviceId))
            .map(serviceId => {
              const service = services?.find(s => s.id === serviceId);
              if (!service) return null;
              
              const servicePrice = service.selling_price;
              const adjustedServicePrice = getServiceDisplayPrice(serviceId);
              
              return {
                id: service.id,
                name: service.name,
                price: servicePrice,
                adjustedPrice: adjustedServicePrice,
                duration: service.duration,
                stylist: selectedStylists[service.id] || "",
                stylistName: selectedStylists[service.id] ? getStylistName(selectedStylists[service.id]) : "",
                time: selectedTimeSlots[service.id] || "",
                isCustomized: true
              };
            })
            .filter(Boolean);

          packageServices.push(...(additionalServices as any[]));
        }

        // Calculate the total duration of all services in the package
        const totalDuration = packageServices.reduce((sum, s) => sum + s.duration, 0);
        
        // Calculate the adjusted total price of the package by summing service prices
        const packageAdjustedPrice = packageServices.reduce((sum, s) => sum + s.adjustedPrice, 0);

        return {
          id: packageId,
          name: pkg.name,
          price: originalPackagePrice,
          adjustedPrice: packageAdjustedPrice, // Use the sum of adjusted service prices
          duration: totalDuration,
          type: "package" as const,
          packageId: null as string | null,
          stylist: "",
          stylistName: "",
          time: "",
          services: packageServices,
          formattedDuration: formatDuration(totalDuration)
        };
      })
    ].filter(Boolean);

    return items as unknown as CheckoutItem[];
  }, [
    selectedServices,
    selectedPackages,
    services,
    packages,
    selectedStylists,
    selectedTimeSlots,
    customizedServices,
    getServiceDisplayPrice,
    getStylistName,
    formatDuration
  ]);

  return { selectedItems };
};
