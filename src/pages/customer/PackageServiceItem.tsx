import React from 'react';
import { Clock, User, Award } from "lucide-react";

interface PackageServiceItemProps {
  service: {
    id: string;
    name: string;
    price: number;
    adjustedPrice?: number;
    duration: number;
    stylistName?: string | null;
    time?: string;
  };
}

export const PackageServiceItem: React.FC<PackageServiceItemProps> = ({ service }) => {
  const hours = Math.floor(service.duration / 60);
  const minutes = service.duration % 60;
  const durationDisplay = hours > 0
    ? `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`
    : `${minutes}m`;

  return (
    <div className="py-2 border-b last:border-b-0 border-gray-200">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium">{service.name}</p>
          <div className="flex flex-wrap text-xs text-muted-foreground gap-2">
            <div className="flex items-center">
              <Clock className="mr-1 h-3 w-3" />
              {service.time && <span>{service.time} • </span>}
              <span>{durationDisplay}</span>
            </div>
            {service.stylistName && (
              <div className="flex items-center">
                <User className="mr-1 h-3 w-3" />
                {service.stylistName}
              </div>
            )}
          </div>
        </div>
        <div className="text-sm flex flex-col items-end">
          {service.adjustedPrice !== undefined && service.price !== service.adjustedPrice && (
            <span className="text-xs line-through text-muted-foreground">
              ₹{service.price.toFixed(2)}
            </span>
          )}
          <span className={service.adjustedPrice !== undefined && service.price !== service.adjustedPrice ? "text-green-600" : ""}>
            ₹{(service.adjustedPrice || service.price).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};