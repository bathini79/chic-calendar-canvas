import React from 'react';
import { IndianRupee, User } from "lucide-react";
import { formatDuration } from 'date-fns';

interface PackageServiceItemProps {
  service: {
    id: string;
    name: string;
    price: number;
    adjustedPrice: number;
    duration: number;
    stylistName?: string | null;
    isCustomized: boolean;
  };
}

export const PackageServiceItem: React.FC<PackageServiceItemProps> = ({ service }) => {
  return (
    <div className="py-2 border-b last:border-b-0 border-gray-200">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium">
            {service.name}
            {service.isCustomized && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                Added
              </span>
            )}
          </p>
          <div className="flex flex-wrap text-xs text-muted-foreground gap-2">
            <span>{formatDuration(service?.duration)}</span>
            {service.stylistName && (
              <div className="flex items-center">
                <User className="mr-1 h-3 w-3" />
                {service.stylistName}
              </div>
            )}
          </div>
        </div>
        <div className="text-sm flex flex-col items-end">
          {service.price !== service.adjustedPrice && (
            <span className="text-xs line-through text-muted-foreground">
              <IndianRupee className="inline h-3 w-3" />
              {service.price.toFixed(2)}
            </span>
          )}
          <span
            className={
              service.price !== service.adjustedPrice ? "text-green-600" : ""
            }
          >
            <IndianRupee className="inline h-3 w-3" />
            {service.adjustedPrice.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};