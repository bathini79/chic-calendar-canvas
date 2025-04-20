import { useMemo } from 'react';
import type { Service, Package } from '../types';
import { getTotalDuration, calculatePackagePrice } from '../utils/bookingUtils';

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
    const individualServices = selectedServices
      .map((id) => {
        const service = services.find((s) => s.id === id);
        return service
          ? {
              id,
              name: service.name,
              price: service.selling_price,
              adjustedPrice: getServiceDisplayPrice(id),
              duration: service.duration,
              type: "service" as const,
              packageId: null as string | null,
              stylist: selectedStylists[id],
              stylistName: getStylistName(selectedStylists[id]),
              time:
                selectedTimeSlots[id] || selectedTimeSlots[appointmentId || ""],
              formattedDuration: formatDuration(service.duration),
            }
          : null;
      })
      .filter(Boolean);

    const packageItems = selectedPackages.flatMap((packageId) => {
      const pkg = packages.find((p) => p.id === packageId);
      if (!pkg) return [];

      const packageTotalPrice = calculatePackagePrice(
        pkg,
        customizedServices[packageId] || [],
        services
      );

      const packageItem = {
        id: packageId,
        name: pkg.name,
        price: packageTotalPrice,
        duration: getTotalDuration(
          [],
          [packageId],
          services,
          packages,
          customizedServices
        ),
        type: "package" as const,
        packageId: null as string | null,
        stylist: selectedStylists[packageId],
        stylistName: getStylistName(selectedStylists[packageId]),
        time:
          selectedTimeSlots[packageId] ||
          selectedTimeSlots[appointmentId || ""],
        formattedDuration: formatDuration(
          getTotalDuration(
            [],
            [packageId],
            services,
            packages,
            customizedServices
          )
        ),
        services: [] as Array<{
          id: string;
          name: string;
          price: number;
          adjustedPrice: number;
          duration: number;
          stylist: string | null;
          stylistName: string | null;
          isCustomized: boolean;
        }>,
      };

      if (pkg.package_services) {
        packageItem.services = pkg.package_services.map((ps) => {
          const serviceId = ps.service.id;
          const adjustedPrice = getServiceDisplayPrice(serviceId);
          const originalPrice =
            ps.package_selling_price !== undefined &&
            ps.package_selling_price !== null
              ? ps.package_selling_price
              : ps.service.selling_price;

          return {
            id: serviceId,
            name: ps.service.name,
            price: originalPrice,
            adjustedPrice: adjustedPrice,
            duration: ps.service.duration,
            stylist:
              selectedStylists[serviceId] ||
              selectedStylists[packageId] ||
              null,
            stylistName: getStylistName(
              selectedStylists[serviceId] ||
                selectedStylists[packageId] ||
                ""
            ),
            isCustomized: false,
          };
        });
      }

      if (
        customizedServices[packageId] &&
        customizedServices[packageId].length > 0
      ) {
        const additionalServices = customizedServices[packageId]
          .filter((serviceId) => {
            return !pkg.package_services.some(
              (ps) => ps.service.id === serviceId
            );
          })
          .map((serviceId) => {
            const service = services.find((s) => s.id === serviceId);
            if (!service) return null;

            return {
              id: service.id,
              name: service.name,
              price: service.selling_price,
              adjustedPrice: getServiceDisplayPrice(service.id),
              duration: service.duration,
              stylist:
                selectedStylists[service.id] ||
                selectedStylists[packageId] ||
                null,
              stylistName: getStylistName(
                selectedStylists[service.id] ||
                  selectedStylists[packageId] ||
                  ""
              ),
              isCustomized: true,
            };
          })
          .filter(Boolean);

        packageItem.services.push(...additionalServices);
      }

      return [packageItem];
    });

    return [...individualServices, ...packageItems];
  }, [
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
  ]);

  return {
    selectedItems,
  };
};