
import React from "react";
import { format } from "date-fns";
import { formatPrice } from "@/lib/utils";
import { CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppointmentCardProps {
  appointment: {
    id: string;
    status: string;
    start_time: string;
    total_price: number;
    bookings: any[];
    location?: string;
  };
  onClick: () => void;
  isPast?: boolean;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onClick,
  isPast = false,
}) => {
  const locationName = appointment.location || "Not specified";
  const appointmentDate = new Date(appointment.start_time);
  const formattedDate = format(appointmentDate, "EEE, dd MMM, yyyy 'at' h:mm a");
  const itemsCount = appointment.bookings.length;
  
  return (
    <div 
      className="border rounded-lg p-4 mb-4 cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start">
        <div className="flex-1">
          <h3 className="font-medium">{locationName}</h3>
          <div className="flex items-center text-sm text-muted-foreground mt-1">
            <CalendarIcon className="h-4 w-4 mr-1" />
            <span>{formattedDate}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="font-medium">{formatPrice(appointment.total_price)}</span>
              <span className="text-xs text-muted-foreground">• {itemsCount} {itemsCount === 1 ? "item" : "items"}</span>
            </div>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="ml-2"
          onClick={(e) => {
            e.stopPropagation();
            // Add booking functionality here
            window.location.href = "/schedule";
          }}
        >
          {isPast ? "Rebook" : "Reschedule"}
        </Button>
      </div>
    </div>
  );
};
