
import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { CheckCircle2, Clock } from "lucide-react";

interface BookingSidebarProps {
  appointment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceedToCheckout: () => void;
}

export const BookingSidebar = ({
  appointment,
  open,
  onOpenChange,
  onProceedToCheckout,
}: BookingSidebarProps) => {
  if (!appointment) return null;

  const isCompletedOrInProgress = 
    appointment.status === "completed" || appointment.status === "in_progress";

  const statusColor = appointment.status === "completed" 
    ? "text-green-600" 
    : "text-blue-600";

  const StatusIcon = appointment.status === "completed" ? CheckCircle2 : Clock;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Booking Details</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          <div className="flex items-center space-x-2">
            <StatusIcon className={`h-5 w-5 ${statusColor}`} />
            <span className={`font-medium ${statusColor} capitalize`}>
              {appointment.status.replace('_', ' ')}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-1">Customer</h3>
              <p>{appointment.customer?.full_name}</p>
              <p className="text-sm text-gray-500">{appointment.customer?.email}</p>
            </div>

            <div>
              <h3 className="font-medium mb-1">Date & Time</h3>
              <p>{format(new Date(appointment.start_time), "PPpp")}</p>
            </div>

            <div>
              <h3 className="font-medium mb-1">Services</h3>
              <div className="space-y-2">
                {appointment.bookings.map((booking: any) => (
                  <div key={booking.id} className="border rounded p-2">
                    <div className="font-medium">
                      {booking.service?.name || booking.package?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      with {booking.employee?.name}
                    </div>
                    <div className="text-sm">
                      Duration: {booking.service?.duration || booking.package?.duration}min
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {appointment.notes && (
              <div>
                <h3 className="font-medium mb-1">Notes</h3>
                <p className="text-gray-600">{appointment.notes}</p>
              </div>
            )}

            <div>
              <h3 className="font-medium mb-1">Total</h3>
              <p className="text-lg font-semibold">₹{appointment.total_price}</p>
            </div>
          </div>

          {isCompletedOrInProgress && (
            <div className="pt-6">
              <Button 
                className="w-full" 
                onClick={onProceedToCheckout}
              >
                Proceed to Checkout
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
