import React, { useState, useEffect } from "react";
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
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarIcon, ChevronDown, Edit, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAppointmentDetails } from "@/hooks/use-appointment-details";
import { AppointmentStatus } from "../types";
import { useToast } from "@/hooks/use-toast";
import { useAppointmentActions } from "../hooks/useAppointmentActions";
import { RefundDialog } from "./RefundDialog";

interface AppointmentDetailsDialogProps {
  appointment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
  onCheckout?: (appointment: any) => void;
  onEdit?: () => void;
}

export const AppointmentDetailsDialog: React.FC<AppointmentDetailsDialogProps> = ({
  appointment,
  open,
  onOpenChange,
  onUpdated,
  onCheckout,
  onEdit
}) => {
  const { toast } = useToast();
  const { isLoading, fetchAppointmentDetails, updateAppointmentStatus } = useAppointmentDetails();
  const { fetchAppointmentDetails: fetchDetails, processRefund, isLoading: isActionLoading } = useAppointmentActions();
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [appointmentDetails, setAppointmentDetails] = useState(null);

  useEffect(() => {
    const loadAppointmentDetails = async () => {
      if (appointment?.id) {
        const details = await fetchAppointmentDetails(appointment.id);
        setAppointmentDetails(details);
      }
    };

    if (open && appointment?.id) {
      loadAppointmentDetails();
    }
  }, [appointment, open, fetchAppointmentDetails]);

  const handleStatusUpdate = async (status: AppointmentStatus) => {
    if (!appointment) return;

    const success = await updateAppointmentStatus(appointment.id, status);
    if (success) {
      toast({
        title: "Success",
        description: `Appointment status updated to ${status}`,
      });
      onOpenChange(false);
      onUpdated?.();
    }
  };

  const handleRefund = async (bookingIds: string[], refundData: { reason: string; notes: string; refundedBy: string }) => {
    if (!appointment) return;

    const success = await processRefund(appointment.id, bookingIds, refundData);
    if (success) {
      toast({
        title: "Success",
        description: "Refund processed successfully",
      });
      setIsRefundDialogOpen(false);
      onOpenChange(false);
      onUpdated?.();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem>
          View Details
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Appointment Details</AlertDialogTitle>
          <AlertDialogDescription>
            {appointmentDetails ? (
              <div className="flex flex-col">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={appointmentDetails.customer?.avatar_url} />
                    <AvatarFallback>{appointmentDetails.customer?.full_name?.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <div className="text-lg font-semibold">{appointmentDetails.customer?.full_name}</div>
                    <div className="text-sm text-muted-foreground">{appointmentDetails.customer?.email}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <Badge variant="secondary">{appointmentDetails.status}</Badge>
                </div>

                <div className="mt-3">
                  <h3 className="text-sm font-medium">Bookings</h3>
                  {appointmentDetails.bookings?.map((booking: any) => (
                    <div key={booking.id} className="border rounded-md p-2 mt-1">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium">{booking.service?.name || booking.package?.name}</div>
                          {booking.package && (
                            <div className="flex flex-col gap-1 mt-2">
                              <div className="text-sm font-medium">Package Details:</div>
                              <div className="text-sm text-muted-foreground">
                                {booking.package?.name || "Unknown Package"}
                              </div>
                            </div>
                          )}
                          {booking.package && (
                            <div className="text-xs text-muted-foreground mb-1">
                              Package: {booking.package?.name || "Unknown Package"}
                            </div>
                          )}
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Time: {booking.start_time ? format(new Date(booking.start_time), "h:mm a") : "N/A"}</span>
                            {booking.package && <span>Duration: {booking.package?.duration || 0} min</span>}
                          </div>
                        </div>
                        <div className="text-sm font-medium">
                          ₹{booking.price_paid || booking.price || 0}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {appointment && appointment.bookings?.some(b => b.employee) && (
                  <div className="mt-3">
                    <h3 className="text-sm font-medium mb-2">Service Providers</h3>
                    <div className="space-y-2">
                      {appointment.bookings?.filter(b => b.employee).map((booking) => (
                        <div key={booking.id} className="flex items-center space-x-3">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={booking.employee?.photo_url} />
                            <AvatarFallback>{booking.employee?.name?.substring(0, 2)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{booking.employee?.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <div className="text-sm font-medium">Total Price:</div>
                  <div className="text-sm text-muted-foreground">₹{appointmentDetails.total_price}</div>
                </div>
              </div>
            ) : (
              <div>Loading...</div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <div className="flex w-full justify-between">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  Actions
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => onEdit?.()}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Appointment
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCheckout?.(appointment)}>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Checkout
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsRefundDialogOpen(true)}>
                  Refund
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusUpdate("confirmed")}>
                  Confirm
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusUpdate("canceled")}>
                  Cancel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusUpdate("noshow")}>
                  Mark as No-Show
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
      <RefundDialog
        isOpen={isRefundDialogOpen}
        onClose={() => setIsRefundDialogOpen(false)}
        appointment={appointmentDetails}
        onRefund={handleRefund}
      />
    </AlertDialog>
  );
};

const ShoppingCart = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-shopping-cart"
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2 9a3 3 0 0 0 3 2.94l13 2.66a1 1 0 0 0 .79-.34.77.77 0 0 0 .19-.53L20.42 7H5.47" />
    </svg>
  );
};
