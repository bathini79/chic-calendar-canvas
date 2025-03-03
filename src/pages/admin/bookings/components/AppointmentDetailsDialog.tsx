
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
  ShoppingCart,
  Package,
  User
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
import {
  Badge
} from "@/components/ui/badge";
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
  },
  voided: {
    title: "Void Appointment",
    description: "Are you sure you want to void this appointment? This cannot be undone.",
    action: "Yes, Void",
    icon: <XCircle className="h-5 w-5 text-red-500" />
  }
};

// Statuses that can no longer be changed (terminal states)
const terminalStatuses = ['completed', 'refunded', 'partially_refunded', 'voided'];

// Status color mapping
const statusColors = {
  completed: 'bg-green-500 text-white',
  confirmed: 'bg-blue-500 text-white',
  inprogress: 'bg-yellow-500 text-white',
  canceled: 'bg-red-500 text-white',
  noshow: 'bg-orange-500 text-white',
  refunded: 'bg-purple-500 text-white',
  partially_refunded: 'bg-purple-300 text-white',
  voided: 'bg-gray-500 text-white',
  pending: 'bg-gray-300 text-black'
};

// Status label mapping
const statusLabels = {
  completed: 'Completed',
  confirmed: 'Confirmed',
  inprogress: 'In Progress',
  canceled: 'Canceled',
  noshow: 'No Show',
  refunded: 'Refunded',
  partially_refunded: 'Partially Refunded',
  voided: 'Voided',
  pending: 'Pending'
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
    if(statusMessages[newStatus as keyof typeof statusMessages]){
      setShowConfirmDialog(true);
    } else {
      handleStatusConfirm();
    }
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
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-500';
  };

  // Group bookings by package
  const groupedBookings = appointment.bookings.reduce((groups, booking) => {
    if (booking.package_id) {
      // If it's a package booking
      if (!groups.packages[booking.package_id]) {
        groups.packages[booking.package_id] = {
          packageDetails: booking.package,
          bookings: [],
          stylist: booking.employee,
          startTime: booking.start_time,
          totalPrice: 0
        };
      }
      
      // Add to package total price if this is a service within the package
      if (booking.service_id) {
        groups.packages[booking.package_id].bookings.push(booking);
      } else if (!booking.service_id) {
        // This is the main package booking (without a specific service)
        groups.packages[booking.package_id].mainBooking = booking;
        groups.packages[booking.package_id].totalPrice = booking.price_paid;
      }
    } else if (booking.service_id) {
      // It's a standalone service
      groups.services.push(booking);
    }
    return groups;
  }, { 
    packages: {} as Record<string, { 
      packageDetails: any, 
      bookings: typeof appointment.bookings, 
      mainBooking?: typeof appointment.bookings[0],
      stylist: any, 
      startTime: string,
      totalPrice: number
    }>, 
    services: [] as typeof appointment.bookings 
  });

  // Only show checkout for active appointments
  const showCheckoutButton = ['inprogress', 'confirmed', 'pending'].includes(appointment.status);
  
  // Check if status is terminal
  const isTerminalStatus = terminalStatuses.includes(appointment.status);

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
              
              {isTerminalStatus ? (
                <Badge className={getStatusColor(appointment.status)}>
                  {statusLabels[appointment.status as keyof typeof statusLabels]}
                </Badge>
              ) : (
                <Select 
                  value={appointment.status} 
                  onValueChange={handleStatusChange}
                  disabled={isLoading || isTerminalStatus}
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
                    <SelectItem value="inprogress">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                        In Progress
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
                    <SelectItem value="voided">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-gray-500" />
                        Voided
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
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
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {/* Display packages first with their services nested underneath */}
                {Object.values(groupedBookings.packages).map((packageGroup) => (
                  <div 
                    key={packageGroup.packageDetails?.id || 'package-group'} 
                    className="border rounded-md p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-blue-500" />
                          <h4 className="font-medium text-blue-600">
                            {packageGroup.packageDetails?.name || 'Package'}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                          <Clock className="h-4 w-4" />
                          <span>
                            {format(new Date(packageGroup.startTime), "h:mm a")} · 
                            {packageGroup.packageDetails?.duration || '0'}min
                          </span>
                        </div>
                        {packageGroup.stylist && (
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <User className="h-4 w-4" />
                            <span>{packageGroup.stylist.name}</span>
                          </div>
                        )}
                      </div>
                      <span className="font-medium">
                        ₹{packageGroup.totalPrice}
                      </span>
                    </div>

                    {/* Display services in this package */}
                    {packageGroup.bookings.length > 0 && (
                      <div className="pl-6 mt-3 space-y-2 border-l-2 border-blue-200">
                        {packageGroup.bookings.map((booking) => (
                          booking.service && (
                            <div key={booking.id} className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium">{booking.service.name}</p>
                                <p className="text-xs text-gray-500">{booking.service.duration}min</p>
                                {booking.employee && (
                                  <p className="text-xs text-gray-500 flex items-center">
                                    <User className="h-3 w-3 mr-1" />
                                    {booking.employee.name}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Display standalone services */}
                {groupedBookings.services.map((booking) => (
                  booking.service && (
                    <div 
                      key={booking.id} 
                      className="border-l-4 border-blue-400 pl-4 py-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">
                            {booking.service.name}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {format(new Date(booking.start_time), "h:mm a")} · 
                              {booking.service.duration}min
                            </span>
                          </div>
                          {booking.employee && (
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                              <User className="h-4 w-4" />
                              <span>{booking.employee.name}</span>
                            </div>
                          )}
                        </div>
                        <span className="font-medium">
                          ₹{booking.price_paid}
                        </span>
                      </div>
                    </div>
                  )
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
