
import React from 'react';
import { IndianRupee, Clock, Package, User, ChevronRight } from "lucide-react";
import { Service, Package as PackageType } from "../types";
import { format } from "date-fns";

interface PackageDetailsViewProps {
  pkg: PackageType;
  services: Service[];
  customizedServices?: string[];
  stylist?: string;
  time?: string;
  showPrices?: boolean;
}

export const PackageDetailsView: React.FC<PackageDetailsViewProps> = ({
  pkg,
  services,
  customizedServices = [],
  stylist,
  time,
  showPrices = true
}) => {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`;
    }
    return `${minutes}m`;
  };

  const formatTimeSlot = (timeString: string) => {
    try {
      const baseDate = new Date();
      const [hours, minutes] = timeString.split(':').map(Number);
      baseDate.setHours(hours, minutes);
      return format(baseDate, 'hh:mm a');
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString;
    }
  };

  const baseServices = pkg.package_services?.map(ps => ps.service) || [];
  const additionalServices = customizedServices
    .map(id => services.find(s => s.id === id))
    .filter((s): s is Service => s !== undefined);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <span className="font-semibold">{pkg.name}</span>
          </div>
          <div className="text-sm text-muted-foreground mt-1 space-y-1">
            {time && (
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                <span>{formatTimeSlot(time)}</span>
              </div>
            )}
            {stylist && (
              <div className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                <span>{stylist}</span>
              </div>
            )}
          </div>
        </div>
        {showPrices && (
          <div className="text-lg font-semibold">
            <IndianRupee className="inline h-4 w-4" />
            {pkg.price}
          </div>
        )}
      </div>

      <div className="ml-6 space-y-2">
        <div className="text-sm font-medium text-muted-foreground">Included Services:</div>
        {baseServices.map(service => (
          <div key={service.id} className="flex items-center justify-between text-sm pl-4 border-l border-gray-200">
            <div>
              <div className="flex items-center gap-2">
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <span>{service.name}</span>
              </div>
              <div className="text-xs text-muted-foreground ml-5">
                {formatDuration(service.duration)}
              </div>
            </div>
            {showPrices && (
              <div className="text-muted-foreground">
                <IndianRupee className="inline h-3 w-3" />
                {service.selling_price}
              </div>
            )}
          </div>
        ))}

        {additionalServices.length > 0 && (
          <>
            <div className="text-sm font-medium text-muted-foreground mt-4">Additional Services:</div>
            {additionalServices.map(service => (
              <div key={service.id} className="flex items-center justify-between text-sm pl-4 border-l border-green-200">
                <div>
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3 text-green-500" />
                    <span>{service.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground ml-5">
                    {formatDuration(service.duration)}
                  </div>
                </div>
                {showPrices && (
                  <div className="text-green-600">
                    <IndianRupee className="inline h-3 w-3" />
                    {service.selling_price}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
