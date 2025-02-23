
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
import { 
  Pencil, 
  CheckCircle, 
  MoreVertical,
  Clock,
  Calendar
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
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
  const appointmentDate = new Date(appointment.start_time);

  // Get first letter of customer name for avatar
  const customerInitial = appointment.customer?.full_name?.[0] || '?';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="border-b pb-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-500" />
              <div>
                <h3 className="font-semibold text-lg">
                  {format(appointmentDate, "EEE dd MMM")}
                </h3>
                <p className="text-sm text-gray-500">
                  {format(appointmentDate, "h:mm a")} · Doesn't repeat
                </p>
              </div>
            </div>
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
          </div>
        </SheetHeader>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 bg-blue-100 text-blue-600 text-xl">
              <span>{customerInitial}</span>
            </Avatar>
            <div>
              <h2 className="font-semibold text-lg">
                {appointment.customer?.full_name}
              </h2>
              <p className="text-sm text-gray-500">
                {appointment.customer?.email}
              </p>
              {appointment.customer?.phone_number && (
                <p className="text-sm text-gray-500">
                  {appointment.customer.phone_number}
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Services</h3>
            <div className="space-y-4">
              {appointment.bookings.map((booking) => (
                <div 
                  key={booking.id} 
                  className="border-l-4 border-blue-400 pl-4 py-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">
                        {booking.service?.name || booking.package?.name}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <Clock className="h-4 w-4" />
                        <span>
                          {format(new Date(booking.start_time), "h:mm a")} · 
                          {booking.service?.duration || booking.package?.duration}min · 
                          {booking.employee?.name}
                        </span>
                      </div>
                    </div>
                    <span className="font-medium">
                      ${booking.price_paid}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {appointment.notes && (
            <div>
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="text-gray-600">{appointment.notes}</p>
            </div>
          )}
        </div>

        <SheetFooter className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t">
          <div className="flex w-full justify-between items-center">
            <div>
              <div className="text-sm text-gray-500">Total</div>
              <div className="text-xl font-semibold">
                ${appointment.total_price}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="outline"
                onClick={onEdit}
              >
                <MoreVertical className="h-4 w-4" />
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
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
