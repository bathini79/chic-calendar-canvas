
import React from 'react';
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Pencil, CheckCircle } from "lucide-react";
import type { Appointment } from '../types';
import { useAppointmentActions } from '../hooks/useAppointmentActions';

interface AppointmentDetailsDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onUpdated?: () => void;
}

export function AppointmentDetailsDialog({
  appointment,
  open,
  onOpenChange,
  onEdit,
  onUpdated
}: AppointmentDetailsDialogProps) {
  const { isLoading, updateAppointmentStatus } = useAppointmentActions();

  if (!appointment) return null;

  const handleComplete = async () => {
    if (!appointment) return;
    
    const bookingIds = appointment.bookings.map(b => b.id);
    const success = await updateAppointmentStatus(
      appointment.id,
      'completed',
      bookingIds
    );

    if (success) {
      onUpdated?.();
    }
  };

  const isCompletable = appointment.status === 'confirmed' || appointment.status === 'inprogress';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Appointment Details</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex justify-between items-center">
            <Badge
              variant={
                appointment.status === "completed"
                  ? "default"
                  : appointment.status === "canceled"
                  ? "destructive"
                  : "secondary"
              }
            >
              {appointment.status.toUpperCase()}
            </Badge>
            <span className="text-sm text-gray-500">
              #{appointment.id.slice(0, 8)}
            </span>
          </div>

          <div>
            <h3 className="font-medium">Customer</h3>
            <p>{appointment.customer?.full_name}</p>
            <p className="text-sm text-gray-500">
              {appointment.customer?.email}
            </p>
            {appointment.customer?.phone_number && (
              <p className="text-sm text-gray-500">
                {appointment.customer.phone_number}
              </p>
            )}
          </div>

          <div>
            <h3 className="font-medium">Date & Time</h3>
            <p>
              {format(new Date(appointment.start_time), "PPpp")} - {' '}
              {format(new Date(appointment.end_time), "p")}
            </p>
          </div>

          <div>
            <h3 className="font-medium">Services & Staff</h3>
            <div className="space-y-2">
              {appointment.bookings.map((booking) => (
                <div key={booking.id} className="border rounded p-2">
                  <div className="font-medium">
                    {booking.service?.name || booking.package?.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    with {booking.employee?.name}
                  </div>
                  <div className="text-sm">
                    Duration: {booking.service?.duration || booking.package?.duration} min
                  </div>
                  <div className="text-sm">
                    Price: ${booking.price_paid}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {appointment.notes && (
            <div>
              <h3 className="font-medium">Notes</h3>
              <p className="text-gray-600">{appointment.notes}</p>
            </div>
          )}

          <div className="space-y-1">
            <h3 className="font-medium">Payment Details</h3>
            <div className="text-sm">
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="capitalize">{appointment.payment_method || 'Not set'}</span>
              </div>
              {appointment.discount_type !== 'none' && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>
                    {appointment.discount_type === 'percentage' 
                      ? `${appointment.discount_value}%`
                      : `₹{appointment.discount_value}`
                    }
                  </span>
                </div>
              )}
              <div className="flex justify-between font-medium">
                <span>Total:</span>
                <span>${appointment.total_price}</span>
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t">
          <div className="flex w-full space-x-2">
            <Button
              onClick={onEdit}
              variant="outline"
              className="flex-1"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
            {isCompletable && (
              <Button
                onClick={handleComplete}
                disabled={isLoading}
                className="flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
