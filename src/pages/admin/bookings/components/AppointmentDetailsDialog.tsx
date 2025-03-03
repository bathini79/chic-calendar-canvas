
import React from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, type StatusType } from "@/components/ui/status-badge";
import { calculatePackageDuration, calculatePackagePrice } from "../utils/bookingUtils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Appointment, Service, Package } from "../types";

interface AppointmentDetailsDialogProps {
  appointment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckout?: (appointment: any) => void;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return format(date, "MMMM d, yyyy 'at' h:mm a");
};

// Terminal statuses don't allow status changes
const TERMINAL_STATUSES: StatusType[] = [
  "completed", 
  "canceled", 
  "voided", 
  "refunded", 
  "partially_refunded",
  "noshow"
];

export function AppointmentDetailsDialog({
  appointment,
  open,
  onOpenChange,
  onCheckout,
}: AppointmentDetailsDialogProps) {
  const [status, setStatus] = React.useState<StatusType>("pending");
  const [isUpdating, setIsUpdating] = React.useState(false);

  React.useEffect(() => {
    if (appointment?.status) {
      setStatus(appointment.status as StatusType);
    }
  }, [appointment]);

  const handleStatusChange = async (newStatus: StatusType) => {
    if (!appointment) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", appointment.id);

      if (error) throw error;
      
      setStatus(newStatus);
      toast.success("Status updated successfully");
    } catch (error) {
      console.error("Error updating appointment status:", error);
      toast.error("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  const isTerminalStatus = appointment?.status && TERMINAL_STATUSES.includes(appointment.status as StatusType);

  if (!appointment) return null;

  // Calculate total service cost by adding up all services and packages
  const calculateTotalCost = () => {
    let total = 0;
    if (!appointment?.bookings) return total;

    appointment.bookings.forEach((booking: any) => {
      if (booking.price_paid) {
        total += Number(booking.price_paid);
      }
    });

    return total;
  };

  const calculateDiscountedTotal = () => {
    const subtotal = calculateTotalCost();
    
    if (appointment.discount_type === 'percentage') {
      return subtotal * (1 - appointment.discount_value / 100);
    } else if (appointment.discount_type === 'fixed') {
      return Math.max(0, subtotal - appointment.discount_value);
    }
    
    return subtotal;
  };

  // Function to get the total duration of all services in minutes
  const calculateTotalDuration = () => {
    let totalDuration = 0;
    if (!appointment?.bookings) return totalDuration;

    appointment.bookings.forEach((booking: any) => {
      // For services
      if (booking.service && booking.service.duration) {
        totalDuration += Number(booking.service.duration);
      }
      
      // For packages, calculate the total duration from all included services
      if (booking.package && booking.package.package_services) {
        booking.package.package_services.forEach((ps: any) => {
          if (ps.service && ps.service.duration) {
            totalDuration += Number(ps.service.duration);
          }
        });
      }
    });

    return totalDuration;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Appointment Details
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[80vh]">
          <div className="space-y-6 p-1">
            {/* Appointment header */}
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div>
                <h3 className="font-medium text-lg">
                  {appointment.customer?.full_name || "Customer"}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {appointment.customer?.email || "No email"}
                </p>
                <p className="text-muted-foreground text-sm">
                  {appointment.customer?.phone_number || "No phone"}
                </p>
              </div>

              <div className="flex flex-col space-y-1 items-end">
                <div className="text-sm text-muted-foreground">
                  {formatDate(appointment.start_time)}
                </div>
                
                {/* Status dropdown or badge based on current status */}
                <div className="mt-2">
                  {isTerminalStatus ? (
                    <StatusBadge status={status as StatusType} />
                  ) : (
                    <Select
                      value={status}
                      onValueChange={(value) => handleStatusChange(value as StatusType)}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="w-[180px]">
                        <StatusBadge status={status as StatusType} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="inprogress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="canceled">Canceled</SelectItem>
                        <SelectItem value="voided">Voided</SelectItem>
                        <SelectItem value="noshow">No Show</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Services and packages list */}
            <div className="space-y-4">
              <h4 className="font-medium">Services & Packages</h4>
              <div className="space-y-3">
                {appointment.bookings?.map((booking: any) => (
                  <div key={booking.id} className="bg-gray-50 p-3 rounded-md">
                    {booking.service && (
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium">{booking.service.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {booking.service.duration} min • 
                            <span className="ml-1">
                              Stylist: {booking.employee?.name || "Unassigned"}
                            </span>
                          </div>
                        </div>
                        <div className="font-medium">₹{booking.price_paid}</div>
                      </div>
                    )}

                    {booking.package && (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <div>
                            <div className="font-medium">{booking.package.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Stylist: {booking.employee?.name || "Unassigned"}
                            </div>
                          </div>
                          <div className="font-medium">₹{booking.price_paid}</div>
                        </div>

                        {/* Display package services */}
                        {booking.package.package_services && booking.package.package_services.length > 0 && (
                          <div className="ml-4 mt-2 border-l-2 pl-3 border-gray-200">
                            <div className="text-sm text-muted-foreground mb-1">Included services:</div>
                            {booking.package.package_services.map((packageService: any) => (
                              <div key={packageService.service.id} className="text-sm flex justify-between">
                                <span>{packageService.service.name} ({packageService.service.duration} min)</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Totals and payment information */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹{calculateTotalCost()}</span>
              </div>

              {appointment.discount_type !== 'none' && appointment.discount_value > 0 && (
                <div className="flex justify-between text-sm">
                  <span>
                    Discount 
                    {appointment.discount_type === 'percentage' ? 
                      ` (${appointment.discount_value}%)` : ''}
                  </span>
                  <span>
                    - ₹{appointment.discount_type === 'percentage' ? 
                      (calculateTotalCost() * appointment.discount_value / 100).toFixed(2) : 
                      appointment.discount_value}
                  </span>
                </div>
              )}

              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>₹{calculateDiscountedTotal()}</span>
              </div>

              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Payment Method</span>
                <span className="capitalize">{appointment.payment_method}</span>
              </div>

              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Duration</span>
                <span>{calculateTotalDuration()} min</span>
              </div>
            </div>

            {appointment.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Notes</h4>
                  <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!isTerminalStatus && onCheckout && (
            <Button 
              onClick={() => onCheckout(appointment)}
              variant="default"
            >
              Edit & Checkout
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
