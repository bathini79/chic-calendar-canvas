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
import { Separator } from "@/components/ui/separator";

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
  onCancel,
}) => {
  const navigate = useNavigate();
  const { addToCart, clearCart, setSelectedLocation } = useCart();
  console.log("Appointment Details:", appointment);
  const appointmentDate = parseISO(appointment.start_time);
  const formattedDate = format(appointmentDate, "EEE, dd MMM, yyyy");
  const formattedTime = format(appointmentDate, "h:mm a");
  // Get the full location information
  const locationAddress = appointment.locationAddress || appointment.location || "Not specified";

  // Calculate total duration in minutes
  const totalDurationMinutes = appointment.bookings.reduce(
    (total: number, booking: any) => {
      return (
        total + (booking.service?.duration || booking.package?.duration || 0)
      );
    },
    0
  );

  const hours = Math.floor(totalDurationMinutes / 60);
  const minutes = totalDurationMinutes % 60;
  const durationText = `${hours > 0 ? `${hours} hours` : ""} ${
    minutes > 0 ? `${minutes} mins` : ""
  }`.trim();

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
            service: booking.service,
          });
        } else if (booking.package) {
          await addToCart(undefined, booking.package_id, {
            name: booking.package.name,
            price: booking.package.price,
            duration: booking.package.duration || 0,
            selling_price: booking.package.price,
            package: booking.package,
          });
        }
      }

      toast.success("Previous services added to cart");

      // Navigate to services page
      navigate("/services");
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
          <p className="text-muted-foreground">
            {formattedTime} • {durationText} duration
          </p>
        </div>
      </div>

      <div className="flex items-start">
        <MapPin className="h-5 w-5 text-primary mr-2 mt-0.5" />
        <div>
          <h3 className="font-medium">Location</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {locationAddress}
          </p>
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
            const durationDisplay = `${hours > 0 ? `${hours} hr` : ""} ${
              minutes > 0 ? `${minutes} mins` : ""
            }`.trim();

            return (
              <div key={booking.id} className="flex justify-between">
                <div>
                  <p className="font-medium">{name}</p>
                  <p className="text-sm text-muted-foreground">
                    {durationDisplay} with {employee?.name || "Staff"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatPrice(pricePaid)}</p>
                  {service?.selling_price && service.selling_price !== pricePaid && (
                    <p className="text-xs text-muted-foreground line-through">
                      {formatPrice(service.selling_price)}
                    </p>
                  )}
                  {packageItem?.price && packageItem.price !== pricePaid && (
                    <p className="text-xs text-muted-foreground line-through">
                      {formatPrice(packageItem.price)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        {/* Subtotal */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatPrice(appointment.subtotal || appointment.total_price)}</span>
        </div>

        {/* Membership Discount - only show if present */}
        {appointment.membership_discount > 0 && appointment.membership_name && (
          <div className="flex justify-between text-sm text-green-600">
            <span className="flex items-center gap-1">
              {appointment.membership_name} Discount
            </span>
            <span>-{formatPrice(appointment.membership_discount)}</span>
          </div>
        )}

        {/* Coupon - only show if present */}
        {appointment.coupon_code && appointment.coupon_discount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span className="flex items-center gap-1">
              Coupon: {appointment.coupon_code}
            </span>
            <span>-{formatPrice(appointment.coupon_discount)}</span>
          </div>
        )}

        {/* Loyalty Points - only show if present */}
        {appointment.points_redeemed > 0 && (
          <div className="flex justify-between text-sm text-amber-600">
            <span className="flex items-center gap-1">
              Loyalty Points Redeemed ({appointment.points_redeemed} pts)
            </span>
            <span>-{formatPrice(appointment.points_value || 0)}</span>
          </div>
        )}

        {/* Tax - only show if present */}
        {appointment.tax_amount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Tax {appointment.tax_name ? `(${appointment.tax_name})` : ''}
            </span>
            <span>{formatPrice(appointment.tax_amount)}</span>
          </div>
        )}

        {/* Round off amount if applicable */}
        {appointment.round_off_difference && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Round Off</span>
            <span>{formatPrice(appointment.round_off_difference)}</span>
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between font-semibold mt-2 pt-2 border-t">
          <span>Total</span>
          <span>{formatPrice(appointment.total_price)}</span>
        </div>
        
        {/* Payment Method */}
        {appointment.payment_method && (
          <div className="flex justify-between text-sm pt-2 mt-1">
            <span className="text-muted-foreground">Paid with</span>
            <span className="capitalize">
              {appointment.payment_method === 'cash' ? 'Cash' : 
               appointment.payment_method === 'card' ? 'Card' : 
               appointment.payment_method === 'online' ? 'Online' : 
               appointment.payment_method}
            </span>
          </div>
        )}
      </div>

      <div className="flex space-x-4">
        {isPast ? (
          <Button onClick={handleRebook} className="flex-1">
            Rebook
          </Button>
        ) : (
          <>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex text-destructive border-destructive hover:bg-destructive/10"
                >
                  Cancel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel this appointment? This
                    action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>No, keep it</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancel}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, cancel appointment
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-2">Cancellation policy</h3>
        <p className="text-sm">
          Please avoid canceling within <strong>12 hours</strong> of your
          appointment time
        </p>
      </div>

      <div className="text-xs text-muted-foreground">
        Booking ref: {appointment.id.substring(0, 8).toUpperCase()}
      </div>
    </div>
  );
};
