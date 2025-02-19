
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface AppointmentDetailsDialogProps {
  appointment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentDetailsDialog({ appointment, open, onOpenChange }: AppointmentDetailsDialogProps) {
  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4">
          <div>
            <Badge
              variant={
                appointment.status === "confirmed"
                  ? "default"
                  : appointment.status === "canceled"
                  ? "destructive"
                  : "secondary"
              }
            >
              {appointment.status.toUpperCase()}
            </Badge>
          </div>

          <div>
            <h3 className="font-medium">Customer</h3>
            <p>{appointment.customer?.full_name}</p>
            <p className="text-sm text-gray-500">
              {appointment.customer?.email}
            </p>
          </div>

          <div>
            <h3 className="font-medium">Date & Time</h3>
            <p>
              {format(new Date(appointment.start_time), "PPpp")}
            </p>
          </div>

          <div>
            <h3 className="font-medium">Services</h3>
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
              <h3 className="font-medium">Notes</h3>
              <p className="text-gray-600">{appointment.notes}</p>
            </div>
          )}

          <div>
            <h3 className="font-medium">Total</h3>
            <p className="text-lg font-semibold">
              ${appointment.total_price}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
