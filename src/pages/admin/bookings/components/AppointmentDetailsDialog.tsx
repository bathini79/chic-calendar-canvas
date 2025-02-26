
import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  MoreVertical,
  Clock,
  Calendar,
  Ban,
  XCircle,
  ShoppingCart
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Appointment } from '../types';
import { useAppointmentActions } from '../hooks/useAppointmentActions';

interface AppointmentDetailsDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onUpdated?: () => void;
  onCheckout?: (appointment: Appointment) => void;
}

const statusMessages = {
  completed: {
    title: "Complete Appointment",
    description: "Are you sure you want to mark this appointment as completed? This will update the service status and cannot be undone.",
    action: "Yes, Complete",
    icon: <CheckCircle className="h-5 w-5 text-green-500" />
  },
  canceled: {
    title: "Cancel Appointment",
    description: "Are you sure you want to cancel this appointment? This will notify the customer and free up the time slot.",
    action: "Yes, Cancel",
    icon: <XCircle className="h-5 w-5 text-red-500" />
  },
  noshow: {
    title: "Mark as No Show",
    description: "Are you sure you want to mark this appointment as a no-show? This will be recorded in the customer's history.",
    action: "Yes, Mark as No Show",
    icon: <Ban className="h-5 w-5 text-orange-500" />
  }
};

export function AppointmentDetailsDialog({
  appointment,
  open,
  onOpenChange,
  onEdit,
  onUpdated,
  onCheckout
}: AppointmentDetailsDialogProps) {
  const { isLoading, updateAppointmentStatus } = useAppointmentActions();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  if (!appointment) return null;

  const handleStatusChange = async (newStatus: string) => {
    setSelectedStatus(newStatus);
    setShowConfirmDialog(true);
  };

  const handleStatusConfirm = async () => {
    if (!appointment || !selectedStatus) return;
    
    const bookingIds = appointment.bookings.map(b => b.id);
    const success = await updateAppointmentStatus(
      appointment.id,
      selectedStatus as Appointment['status'],
      bookingIds
    );

    if (success) {
      onUpdated?.();
      setShowConfirmDialog(false);
    }
  };

  const handleCheckout = () => {
    if (appointment && onCheckout) {
      onCheckout(appointment);
    }
  };

  const appointmentDate = new Date(appointment.start_time);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  const customerInitials = appointment.customer?.full_name 
    ? getInitials(appointment.customer.full_name)
    : '?';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'canceled':
      case 'noshow':
        return 'bg-red-500';
      case 'confirmed':
        return 'bg-blue-500';
      case 'inprogress':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const showCheckoutButton = ['inprogress', 'confirmed'].includes(appointment.status);

  const selectedMessage = selectedStatus ? statusMessages[selectedStatus as keyof typeof statusMessages] : null;

  return (
    <>
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
              <Select 
                value={appointment.status} 
                onValueChange={handleStatusChange}
                disabled={isLoading}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      Confirmed
                    </div>
                  </SelectItem>
                  <SelectItem value="completed">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      Completed
                    </div>
                  </SelectItem>
                  <SelectItem value="canceled">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      Canceled
                    </div>
                  </SelectItem>
                  <SelectItem value="noshow">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-orange-500" />
                      No Show
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </SheetHeader>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className={`h-16 w-16 ${getStatusColor(appointment.status)} text-white text-xl`}>
                <AvatarFallback>{customerInitials}</AvatarFallback>
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
                        ₹{booking.price_paid}
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

          <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t">
            <div className="flex w-full justify-between items-center">
              <div>
                <div className="text-sm text-gray-500">Total</div>
                <div className="text-xl font-semibold">
                  ₹{appointment.total_price}
                </div>
              </div>
              <div className="flex gap-2">
                {showCheckoutButton && (
                  <Button
                    variant="default"
                    onClick={handleCheckout}
                    className="flex items-center gap-2"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Checkout
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="outline"
                  onClick={onEdit}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {selectedMessage?.icon}
              {selectedMessage?.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedMessage?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleStatusConfirm}
              disabled={isLoading}
            >
              {selectedMessage?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
