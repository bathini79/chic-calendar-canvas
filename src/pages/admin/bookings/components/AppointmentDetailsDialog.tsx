
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  XCircle,
  ShoppingCart,
  Package,
  User,
  MapPin
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Appointment, AppointmentStatus } from "../types";
import { StatusBadge } from "./StatusBadge";
import { Separator } from "@/components/ui/separator";
import { useAppointmentActions } from "../hooks/useAppointmentActions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface AppointmentDetailsDialogProps {
  appointment: Appointment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
  onCheckout?: (appointment: Appointment) => void;
}

export function AppointmentDetailsDialog({
  appointment,
  open,
  onOpenChange,
  onUpdated,
  onCheckout,
}: AppointmentDetailsDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundNotes, setRefundNotes] = useState("");

  const { changeStatus, refundAppointment } = useAppointmentActions(onUpdated);

  // Query to get location name
  const { data: locationData } = useQuery({
    queryKey: ['location', appointment.location],
    queryFn: async () => {
      if (!appointment.location) return null;
      
      const { data, error } = await supabase
        .from('locations')
        .select('name')
        .eq('id', appointment.location)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!appointment.location
  });

  // Group bookings by service and employee
  const groupedBookings = appointment.bookings.reduce((acc, booking) => {
    const key = `${booking.service?.name || 'Package'}-${booking.employee?.name || 'Unassigned'}`;
    if (!acc[key]) {
      acc[key] = {
        service: booking.service,
        package: booking.package,
        employee: booking.employee,
        count: 1,
        total: Number(booking.price_paid)
      };
    } else {
      acc[key].count += 1;
      acc[key].total += Number(booking.price_paid);
    }
    return acc;
  }, {} as Record<string, any>);

  const handleStatusChange = (status: AppointmentStatus) => {
    setSelectedStatus(status);
    setStatusDialogOpen(true);
  };

  const confirmStatusChange = async () => {
    if (selectedStatus) {
      await changeStatus(appointment.id, selectedStatus);
      setStatusDialogOpen(false);
    }
  };

  const handleRefund = async () => {
    await refundAppointment(appointment.id, refundReason, refundNotes);
    setRefundDialogOpen(false);
    onOpenChange(false);
  };

  const canRefund = appointment.status !== 'refunded' && appointment.transaction_type !== 'refund';
  const showCheckoutButton = ['inprogress', 'confirmed', 'pending'].includes(appointment.status);

  const selectedMessage = selectedStatus ? statusMessages[selectedStatus as keyof typeof statusMessages] : null;

  const handleCheckoutClick = () => {
    if (onCheckout) {
      onCheckout(appointment);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Appointment Details</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6 mt-4">
            {/* Status Badge and Change Status Button */}
            <div className="flex items-center justify-between">
              <StatusBadge status={appointment.status} size="large" />
              
              <Select onValueChange={handleStatusChange} value={appointment.status}>
                <SelectTrigger className="w-[160px]">
                  <span>Change Status</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="inprogress">In Progress</SelectItem>
                  <SelectItem value="noshow">No Show</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Date and Time */}
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-lg flex items-center">
                  <CalendarDays className="h-5 w-5 mr-2" />
                  Date & Time
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm font-medium">Date</p>
                    <p className="text-sm">
                      {format(new Date(appointment.start_time), 'EEE, MMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Time</p>
                    <p className="text-sm">
                      {format(new Date(appointment.start_time), 'h:mm a')} - {format(new Date(appointment.end_time), 'h:mm a')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Services */}
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-lg flex items-center">
                  {appointment.bookings.some(b => b.package) 
                    ? <Package className="h-5 w-5 mr-2" /> 
                    : <ShoppingCart className="h-5 w-5 mr-2" />}
                  Services
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 space-y-3">
                {Object.values(groupedBookings).map((group: any, index) => (
                  <div key={index} className="flex justify-between items-start py-1">
                    <div>
                      <p className="text-sm font-medium">
                        {group.service?.name || (group.package?.name + ' (Package)')}
                        {group.count > 1 && ` (${group.count})`}
                      </p>
                      <p className="text-xs text-gray-500">With {group.employee?.name || 'Unassigned'}</p>
                    </div>
                    <p className="text-sm font-medium">${group.total.toFixed(2)}</p>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-medium pt-1">
                  <span>Total</span>
                  <span>${Number(appointment.total_price).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Customer Details */}
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-lg flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Customer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {appointment.customer?.full_name?.substring(0, 2).toUpperCase() || 'CU'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{appointment.customer?.full_name || 'Anonymous'}</p>
                    {appointment.customer?.email && (
                      <p className="text-xs text-gray-500">{appointment.customer.email}</p>
                    )}
                    {appointment.customer?.phone_number && (
                      <p className="text-sm text-gray-500">
                        {appointment.customer.phone_number}
                      </p>
                    )}
                    {appointment.location && (
                      <p className="text-sm text-gray-500 flex items-center mt-1">
                        <MapPin className="h-3.5 w-3.5 mr-1 text-gray-400" />
                        {locationData?.name || 'Unknown Location'}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Notes */}
            {appointment.notes && (
              <Card>
                <CardHeader className="py-2">
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <p className="text-sm">{appointment.notes}</p>
                </CardContent>
              </Card>
            )}
            
            {/* Button Group */}
            <div className="flex flex-col gap-2">
              {showCheckoutButton && (
                <Button 
                  className="w-full"
                  onClick={handleCheckoutClick}
                >
                  Checkout
                </Button>
              )}
              
              {canRefund && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setRefundDialogOpen(true)}
                >
                  Issue Refund
                </Button>
              )}
            </div>
          </div>
          
        </SheetContent>
      </Sheet>

      {/* Status Change Dialog */}
      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Appointment Status</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedMessage?.description || 'Are you sure you want to change the status of this appointment?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Refund Dialog */}
      <AlertDialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Issue Refund</AlertDialogTitle>
            <AlertDialogDescription>
              This will refund the full amount of ${Number(appointment.total_price).toFixed(2)} to the customer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 mb-4">
            <div>
              <label htmlFor="refund-reason" className="text-sm font-medium">Reason for Refund</label>
              <Select value={refundReason} onValueChange={setRefundReason}>
                <SelectTrigger id="refund-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer_request">Customer Request</SelectItem>
                  <SelectItem value="service_issue">Service Issue</SelectItem>
                  <SelectItem value="scheduling_conflict">Scheduling Conflict</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="refund-notes" className="text-sm font-medium">Additional Notes</label>
              <Textarea 
                id="refund-notes" 
                value={refundNotes} 
                onChange={(e) => setRefundNotes(e.target.value)}
                placeholder="Add any additional notes about this refund"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRefund}
              disabled={!refundReason}
              className="bg-destructive hover:bg-destructive/90">
              Issue Refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const statusMessages = {
  pending: {
    description: "This will mark the appointment as pending confirmation."
  },
  confirmed: {
    description: "This will confirm the appointment."
  },
  inprogress: {
    description: "This will mark the appointment as in progress."
  },
  completed: {
    description: "This will mark the appointment as completed."
  },
  canceled: {
    description: "This will cancel the appointment. The time slot will become available again."
  },
  noshow: {
    description: "This will mark the appointment as a no-show."
  }
};
