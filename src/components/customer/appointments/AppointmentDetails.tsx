
import React from "react";
import { format } from "date-fns";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, AlertCircle, ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface AppointmentDetailsProps {
  appointment: any;
  onBookAgain: () => void;
}

export const AppointmentDetails: React.FC<AppointmentDetailsProps> = ({
  appointment,
  onBookAgain,
}) => {
  if (!appointment) return null;

  const appointmentDate = new Date(appointment.start_time);
  const formattedDate = format(appointmentDate, "EEE, dd MMM, yyyy 'at' h:mm a");
  
  // Calculate total duration
  const totalDurationMinutes = appointment.bookings.reduce((total: number, booking: any) => {
    return total + (booking.service?.duration || booking.package?.duration || 0);
  }, 0);
  
  // Convert to hours and minutes
  const hours = Math.floor(totalDurationMinutes / 60);
  const minutes = totalDurationMinutes % 60;
  const durationDisplay = `${hours} ${hours === 1 ? 'hour' : 'hours'} duration`;
  
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "destructive" | "outline" | "secondary" | "success", label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      confirmed: { variant: "default", label: "Confirmed" },
      completed: { variant: "success", label: "Completed" },
      canceled: { variant: "destructive", label: "Cancelled" },
      noshow: { variant: "destructive", label: "No Show" },
    };
    
    const statusConfig = statusMap[status] || { variant: "outline", label: status };
    
    return (
      <Badge variant={statusConfig.variant} className="ml-3">
        {statusConfig.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        {appointment.status === "canceled" && (
          <Badge variant="destructive" className="absolute right-0 top-0">
            Cancelled
          </Badge>
        )}
        <h2 className="text-2xl font-bold">{formattedDate}</h2>
        <p className="text-muted-foreground">{durationDisplay}</p>
      </div>

      <Card className="bg-muted/40">
        <CardContent className="p-4 flex items-center space-x-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">Book again</p>
            <p className="text-sm text-muted-foreground">Book your next appointment</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/40">
        <CardContent className="p-4 flex items-center space-x-2">
          <MapPin className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">Venue details</p>
            <p className="text-sm text-muted-foreground">{appointment.location}</p>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-bold mb-4">Overview</h3>
        <div className="space-y-4">
          {appointment.bookings.map((booking: any) => {
            const serviceName = booking.service?.name || booking.package?.name;
            const employeeName = booking.employee?.name;
            const duration = booking.service?.duration || booking.package?.duration;
            const durationText = duration ? `${Math.floor(duration / 60)} hr, ${duration % 60} mins` : '';
            
            return (
              <div key={booking.id} className="flex justify-between">
                <div>
                  <p className="font-medium">{serviceName}</p>
                  {employeeName && durationText && (
                    <p className="text-sm text-muted-foreground">{durationText} with {employeeName}</p>
                  )}
                </div>
                <p className="font-medium">{formatPrice(booking.price_paid)}</p>
              </div>
            );
          })}
          
          <div className="flex justify-between pt-4 border-t">
            <p className="font-bold">Total</p>
            <p className="font-bold">{formatPrice(appointment.total_price)}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-2">Cancellation policy</h3>
        <p className="text-sm">
          Please avoid canceling within <span className="font-bold">12 hours</span> of your appointment time
        </p>
      </div>

      {appointment.notes && (
        <div>
          <h3 className="text-lg font-bold mb-2">Important info</h3>
          <p className="text-sm">{appointment.notes}</p>
        </div>
      )}

      <div className="text-xs text-muted-foreground border-t pt-2">
        Booking ref: {appointment.id.substring(0, 8).toUpperCase()}
      </div>
    </div>
  );
};
