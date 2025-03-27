
import React from "react";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Service {
  id: string;
  name: string;
  duration: number;
}

interface Package {
  id: string;
  name: string;
  duration: number;
}

interface Employee {
  id: string;
  name: string;
}

interface Booking {
  id: string;
  service: Service | null;
  package: Package | null;
  employee: Employee | null;
  price_paid: number;
}

interface AppointmentCardProps {
  id: string;
  status: string;
  date: string;
  locationName: string | undefined;
  bookings: Booking[];
  totalPrice: number;
  onClick?: () => void;
  onRebook?: () => void;
  compact?: boolean;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  id,
  status,
  date,
  locationName,
  bookings,
  totalPrice,
  onClick,
  onRebook,
  compact = false,
}) => {
  const appointmentDate = new Date(date);
  const formattedDate = format(appointmentDate, "EEE, dd MMM, yyyy 'at' h:mm a");
  const itemsCount = bookings.length;
  
  // Calculate total duration
  const totalDurationMinutes = bookings.reduce((total, booking) => {
    return total + (booking.service?.duration || booking.package?.duration || 0);
  }, 0);
  
  // Convert to hours and minutes
  const hours = Math.floor(totalDurationMinutes / 60);
  const minutes = totalDurationMinutes % 60;
  const durationDisplay = `${hours > 0 ? `${hours} ${hours === 1 ? 'hour' : 'hours'}` : ''} ${minutes > 0 ? `${minutes} min` : ''}`.trim();
  
  const getStatusBadge = () => {
    const statusMap: Record<string, { variant: "default" | "destructive" | "outline" | "secondary" | "success", label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      confirmed: { variant: "default", label: "Confirmed" },
      completed: { variant: "success", label: "Completed" },
      canceled: { variant: "destructive", label: "Cancelled" },
      noshow: { variant: "destructive", label: "No Show" },
    };
    
    const statusConfig = statusMap[status] || { variant: "outline", label: status };
    
    return (
      <Badge variant={statusConfig.variant}>
        {statusConfig.label}
      </Badge>
    );
  };
  
  if (compact) {
    return (
      <div 
        className="relative flex items-start p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors mb-3"
        onClick={onClick}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-col">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium">{locationName}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(appointmentDate, "EEE, dd MMM, yyyy 'at' h:mm a")}
                </p>
                <p className="font-medium text-sm mt-1">₹{formatPrice(totalPrice)} • {itemsCount} {itemsCount === 1 ? 'item' : 'items'}</p>
              </div>
              <div className="ml-4">
                <Button variant="outline" size="sm" onClick={(e) => {
                  e.stopPropagation();
                  onRebook?.();
                }}>
                  Rebook
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="border rounded-lg overflow-hidden mb-6">
      <div className="p-4 bg-background">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-lg">{locationName}</h3>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formattedDate}
              </p>
              {durationDisplay && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {durationDisplay}
                </p>
              )}
            </div>
          </div>
          <div>
            {getStatusBadge()}
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          {bookings.map((booking) => {
            const serviceName = booking.service?.name || booking.package?.name;
            const employeeName = booking.employee?.name;
            
            return (
              <div key={booking.id} className="flex justify-between">
                <div>
                  <p className="font-medium">{serviceName}</p>
                  {employeeName && (
                    <p className="text-sm text-muted-foreground">with {employeeName}</p>
                  )}
                </div>
                <p className="font-medium">{formatPrice(booking.price_paid)}</p>
              </div>
            );
          })}
        </div>
        
        <div className="flex justify-between mt-4 pt-3 border-t">
          <p className="font-bold">Total</p>
          <p className="font-bold">{formatPrice(totalPrice)}</p>
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onRebook}>
            Book again
          </Button>
        </div>
      </div>
    </div>
  );
};
