
import React from "react";
import { format, formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Store, ArrowLeft, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppointmentDetailsProps {
  appointment: any;
  onBack: () => void;
}

export const AppointmentDetails: React.FC<AppointmentDetailsProps> = ({
  appointment,
  onBack,
}) => {
  const appointmentDate = new Date(appointment.start_time);
  const formattedDate = format(appointmentDate, "EEE, dd MMM, yyyy 'at' h:mm a");
  const locationName = appointment.location || "Not specified";

  // Calculate total duration in minutes
  const totalDurationMinutes = appointment.bookings.reduce((total: number, booking: any) => {
    return total + (booking.service?.duration || booking.package?.duration || 0);
  }, 0);

  const hours = Math.floor(totalDurationMinutes / 60);
  const minutes = totalDurationMinutes % 60;
  const durationText = `${hours > 0 ? `${hours} hours` : ""} ${minutes > 0 ? `${minutes} mins` : ""}`.trim();
  
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "success" | "destructive" | "default" | "outline" | "secondary", label: string }> = {
      completed: { variant: "success", label: "Completed" },
      canceled: { variant: "destructive", label: "Cancelled" },
      "no-show": { variant: "destructive", label: "No-show" },
      noshow: { variant: "destructive", label: "No-show" },
      confirmed: { variant: "success", label: "Confirmed" },
      pending: { variant: "outline", label: "Pending" },
    };
    
    const statusInfo = statusMap[status.toLowerCase()] || { variant: "default", label: status };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="p-0">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
        {appointment.status && getStatusBadge(appointment.status)}
      </div>
      
      <div>
        <h2 className="text-2xl font-bold">{formattedDate}</h2>
        <p className="text-muted-foreground">{durationText} duration</p>
      </div>

      <div className="flex items-center">
        <ShoppingCart className="h-5 w-5 text-primary mr-2" />
        <div>
          <h3 className="font-medium">Book again</h3>
          <p className="text-sm text-muted-foreground">Book your next appointment</p>
        </div>
      </div>

      <div className="flex items-center">
        <Store className="h-5 w-5 text-primary mr-2" />
        <div>
          <h3 className="font-medium">Venue details</h3>
          <p className="text-sm text-muted-foreground">{locationName}</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Overview</h3>
        <div className="space-y-4">
          {appointment.bookings.map((booking: any) => {
            const service = booking.service;
            const packageItem = booking.package;
            const employee = booking.employee;
            const name = service?.name || packageItem?.name || "Service";
            const duration = service?.duration || packageItem?.duration || 0;
            const pricePaid = booking.price_paid || 0;
            
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            const durationDisplay = `${hours > 0 ? `${hours} hr` : ""} ${minutes > 0 ? `${minutes} mins` : ""}`.trim();
            
            return (
              <div key={booking.id} className="flex justify-between">
                <div>
                  <p className="font-medium">{name}</p>
                  <p className="text-sm text-muted-foreground">
                    {durationDisplay} with {employee?.name || "Staff"}
                  </p>
                </div>
                <p className="font-medium">{formatPrice(pricePaid)}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-4 border-t">
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>{formatPrice(appointment.total_price)}</span>
        </div>
      </div>

      <div className="pt-4 border-t">
        <h3 className="text-lg font-semibold mb-2">Cancellation policy</h3>
        <p className="text-sm">
          Please avoid canceling within <strong>12 hours</strong> of your appointment time
        </p>
      </div>

      {appointment.notes && (
        <div className="pt-4 border-t">
          <h3 className="text-lg font-semibold mb-2">Important info</h3>
          <p className="text-sm">{appointment.notes}</p>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Booking ref: {appointment.id.substr(0, 8).toUpperCase()}
      </div>
    </div>
  );
};
