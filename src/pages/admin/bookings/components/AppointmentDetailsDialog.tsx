
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { format } from "date-fns";
import { 
  Clock, 
  Calendar,
  IndianRupee,
  User,
  Mail,
  Phone,
  CreditCard,
  Banknote,
  Percent
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Appointment } from "../types";
import { PackageDetailsView } from "./PackageDetailsView";

interface AppointmentDetailsDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckout?: (appointment: Appointment) => void;
}

export function AppointmentDetailsDialog({
  appointment,
  open,
  onOpenChange,
  onCheckout
}: AppointmentDetailsDialogProps) {
  if (!appointment) return null;

  const formatTimeSlot = (dateString: string) => {
    try {
      return format(new Date(dateString), 'hh:mm a');
    } catch (error) {
      console.error('Error formatting time:', error);
      return dateString;
    }
  };

  const groupBookingsByPackage = () => {
    const packageBookings = appointment.bookings.filter(b => b.package_id);
    const serviceBookings = appointment.bookings.filter(b => b.service_id && !b.package_id);
    
    const grouped = new Map();
    packageBookings.forEach(booking => {
      if (!booking.package_id) return;
      
      const existingGroup = grouped.get(booking.package_id) || {
        package: booking.package,
        bookings: [],
        stylist: booking.employee?.name,
        time: formatTimeSlot(booking.start_time)
      };
      existingGroup.bookings.push(booking);
      grouped.set(booking.package_id, existingGroup);
    });

    return {
      packages: Array.from(grouped.values()),
      services: serviceBookings
    };
  };

  const { packages, services } = groupBookingsByPackage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(appointment.start_time), 'EEEE, MMMM d, yyyy')}
              </span>
              <Clock className="h-4 w-4 ml-2" />
              <span>{formatTimeSlot(appointment.start_time)}</span>
            </div>

            <div className="mt-4 space-y-2">
              <h3 className="font-semibold text-lg">
                {appointment.customer?.full_name || 'No name provided'}
              </h3>
              {appointment.customer?.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {appointment.customer.email}
                </div>
              )}
              {appointment.customer?.phone_number && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {appointment.customer.phone_number}
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-6">
            {packages.map(({ package: pkg, stylist, time }) => (
              <div key={pkg.id} className="space-y-2">
                <PackageDetailsView
                  pkg={pkg}
                  services={[]}
                  customizedServices={[]}
                  stylist={stylist}
                  time={time}
                />
              </div>
            ))}

            {services.map((booking) => (
              booking.service && (
                <div key={booking.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">{booking.service.name}</p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4" />
                        <span>
                          {formatTimeSlot(booking.start_time)} • {booking.service.duration} min
                        </span>
                      </div>
                      {booking.employee && (
                        <div className="flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          {booking.employee.name}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="font-semibold">
                    <IndianRupee className="inline h-4 w-4" />
                    {booking.price_paid}
                  </p>
                </div>
              )
            ))}
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₹{appointment.total_price}</span>
            </div>

            {appointment.discount_type !== "none" && (
              <div className="flex justify-between text-sm text-green-600">
                <span className="flex items-center">
                  <Percent className="mr-2 h-4 w-4" />
                  Discount
                  {appointment.discount_type === "percentage" && 
                    ` (${appointment.discount_value}%)`
                  }
                </span>
                <span>
                  -₹{appointment.discount_value}
                </span>
              </div>
            )}

            <div className="flex justify-between text-lg font-bold pt-2">
              <span>Total</span>
              <span>₹{appointment.total_price}</span>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
              <span>Paid with {appointment.payment_method === 'cash' ? 'Cash' : 'Online'}</span>
              <span className="flex items-center">
                {appointment.payment_method === 'cash' ? (
                  <Banknote className="mr-2 h-4 w-4" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                ₹{appointment.total_price}
              </span>
            </div>
          </div>

          {appointment.notes && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Notes</h4>
                <p className="text-sm text-muted-foreground">{appointment.notes}</p>
              </div>
            </>
          )}

          {onCheckout && (
            <div className="flex justify-end gap-2 pt-4">
              <Button onClick={() => onCheckout(appointment)}>
                Checkout
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
