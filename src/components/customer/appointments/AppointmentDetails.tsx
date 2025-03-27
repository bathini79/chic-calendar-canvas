
import React, { useState } from "react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { formatPrice } from "@/lib/utils";
import { MapPin, ArrowLeft, ShoppingCart, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/pages/admin/bookings/components/StatusBadge";
import type { AppointmentStatus } from "@/types/appointment";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/components/cart/CartContext";
import { toast } from "sonner";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AppointmentDetailsProps {
  appointment: any;
  onBack: () => void;
  onReschedule: (id: string) => void;
  onCancel?: (id: string) => void;
}

export const AppointmentDetails: React.FC<AppointmentDetailsProps> = ({
  appointment,
  onBack,
  onReschedule,
  onCancel
}) => {
  const navigate = useNavigate();
  const { addToCart, clearCart, setSelectedLocation } = useCart();
  
  const appointmentDate = parseISO(appointment.start_time);
  const formattedDate = format(appointmentDate, "EEE, dd MMM, yyyy");
  const formattedTime = format(appointmentDate, "h:mm a");
  const locationName = appointment.location || "Not specified";

  // Calculate total duration in minutes
  const totalDurationMinutes = appointment.bookings.reduce((total: number, booking: any) => {
    return total + (booking.service?.duration || booking.package?.duration || 0);
  }, 0);

  const hours = Math.floor(totalDurationMinutes / 60);
  const minutes = totalDurationMinutes % 60;
  const durationText = `${hours > 0 ? `${hours} hours` : ""} ${minutes > 0 ? `${minutes} mins` : ""}`.trim();
  
  const isPast = new Date(appointment.start_time) < new Date();
  
  const handleReschedule = () => {
    onReschedule(appointment.id);
  };
  
  const handleCancel = () => {
    if (onCancel) {
      onCancel(appointment.id);
    }
  };

  const handleRebook = async () => {
    try {
      // Clear existing cart
      await clearCart();
      
      // Set the location first
      if (appointment.location) {
        setSelectedLocation(appointment.location);
      }
      
      // Add all services and packages from the appointment to the cart
      for (const booking of appointment.bookings) {
        if (booking.service) {
          await addToCart(booking.service_id, undefined, {
            name: booking.service.name,
            price: booking.service.selling_price,
            duration: booking.service.duration,
            selling_price: booking.service.selling_price,
            service: booking.service
          });
        } else if (booking.package) {
          await addToCart(undefined, booking.package_id, {
            name: booking.package.name,
            price: booking.package.price,
            duration: booking.package.duration || 0,
            selling_price: booking.package.price,
            package: booking.package
          });
        }
      }
      
      toast.success("Previous services added to cart");
      
      // Navigate to services page
      navigate('/services');
    } catch (error) {
      console.error("Error rebooking:", error);
      toast.error("Failed to rebook appointment");
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="p-0">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
        {appointment.status && (
          <StatusBadge status={appointment.status as AppointmentStatus} />
        )}
      </div>
      
      <div>
        <h2 className="text-2xl font-bold">{formattedDate}</h2>
        <div className="flex items-center mt-1">
          <Clock className="h-4 w-4 mr-2 text-primary" />
          <p className="text-muted-foreground">{formattedTime} • {durationText} duration</p>
        </div>
      </div>

      <div className="flex items-center">
        <MapPin className="h-5 w-5 text-primary mr-2" />
        <div>
          <h3 className="font-medium">Location</h3>
          <p className="text-sm text-muted-foreground">{locationName}</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Services</h3>
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

      <div className="flex space-x-4">
        {isPast ? (
          <Button 
            onClick={handleRebook} 
            className="flex-1"
          >
            Rebook
          </Button>
        ) : (
          <>
            <Button 
              onClick={handleReschedule} 
              className="flex-1"
            >
              Reschedule
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="flex-1 text-destructive border-destructive hover:bg-destructive/10"
                >
                  Cancel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel this appointment? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>No, keep it</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, cancel appointment
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>

      <div className="pt-4 border-t">
        <h3 className="text-lg font-semibold mb-2">Cancellation policy</h3>
        <p className="text-sm">
          Please avoid canceling within <strong>12 hours</strong> of your appointment time
        </p>
      </div>

      <div className="text-xs text-muted-foreground">
        Booking ref: {appointment.id.substring(0, 8).toUpperCase()}
      </div>
    </div>
  );
};
