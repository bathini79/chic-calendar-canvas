
import { useMemo } from 'react';
import type { Service, Package } from '../types';
import { getTotalDuration, calculatePackagePrice } from '../utils/bookingUtils';

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

        const packageServices = pkg.package_services?.map(ps => ({
          id: ps.service.id,
          name: ps.service.name,
          price: ps.package_selling_price || ps.service.selling_price,
          adjustedPrice: getServiceDisplayPrice(ps.service.id),
          duration: ps.service.duration,
          stylist: selectedStylists[ps.service.id] || "",
          stylistName: selectedStylists[ps.service.id] ? getStylistName(selectedStylists[ps.service.id]) : "",
          time: selectedTimeSlots[ps.service.id] || "",
          isCustomized: false
        })) || [];

        // Add customized services
        if (pkg.is_customizable && customizedServices[packageId]) {
          const additionalServices = customizedServices[packageId]
            .filter(serviceId => !packageServices.some(ps => ps.id === serviceId))
            .map(serviceId => {
              const service = services?.find(s => s.id === serviceId);
              if (!service) return null;
              return {
                id: service.id,
                name: service.name,
                price: service.selling_price,
                adjustedPrice: getServiceDisplayPrice(service.id),
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

        const totalDuration = packageServices.reduce((sum, s) => sum + s.duration, 0);
        const packageTotalPrice = calculatePackagePrice(pkg, customizedServices[packageId] || [], services);

        return {
          id: packageId,
          name: pkg.name,
          price: packageTotalPrice,
          adjustedPrice: packageServices.reduce((sum, s) => sum + s.adjustedPrice, 0),
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
