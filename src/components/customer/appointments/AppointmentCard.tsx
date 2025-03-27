
import React from "react";
import { format, parseISO } from "date-fns";
import { formatPrice } from "@/lib/utils";
import { MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/pages/admin/bookings/components/StatusBadge";
import type { AppointmentStatus } from "@/types/appointment";

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
  onReschedule: (id: string) => void;
  onCancel?: (id: string) => void;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onClick,
  isPast = false,
  onReschedule,
  onCancel
}) => {
  const locationName = appointment.location || "Not specified";
  const appointmentDate = parseISO(appointment.start_time);
  const formattedDate = format(appointmentDate, "HH:mm - ");
  const endDate = new Date(appointmentDate.getTime() + 30 * 60000); // Adding 30 minutes as default duration
  const formattedEndTime = format(endDate, "HH:mm");
  
  // Get day, date and month for the calendar-style display
  const day = format(appointmentDate, "EEE");
  const dateNum = format(appointmentDate, "dd");
  const month = format(appointmentDate, "MMM");
  
  const handleReschedule = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReschedule(appointment.id);
  };
  
  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCancel) {
      onCancel(appointment.id);
    }
  };
  
  return (
    <div 
      className="border rounded-lg p-4 mb-4 cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start">
        {/* Calendar-style date display */}
        <div className="mr-4 text-center">
          <div className="font-medium text-gray-500">{day}</div>
          <div className="text-2xl font-bold text-orange-500">{dateNum}</div>
          {month !== format(new Date(), "MMM") && (
            <div className="text-sm text-gray-500">{month}</div>
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center text-sm">
              <Clock className="h-4 w-4 mr-2 text-gray-500" />
              <span className="text-gray-700">{formattedDate}{formattedEndTime}</span>
              {appointment.status && (
                <div className="ml-2">
                  <StatusBadge status={appointment.status as AppointmentStatus} />
                </div>
              )}
            </div>
            
            <div className="flex items-center text-sm">
              <MapPin className="h-4 w-4 mr-2 text-gray-500" />
              <span className="text-gray-700">{locationName}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col space-y-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleReschedule}
          >
            Reschedule
          </Button>
          
          {!isPast && (
            <Button 
              variant="outline" 
              size="sm"
              className="text-destructive border-destructive hover:bg-destructive/10"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
