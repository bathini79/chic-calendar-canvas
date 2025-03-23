import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Appointment, AppointmentStatus } from "../types";
import { useAppointmentDetails } from "../hooks/useAppointmentDetails";
import { format } from "date-fns";
import { IndianRupee, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAppointmentActions } from "../hooks/useAppointmentActions";
import StatusBadge from "./StatusBadge";
import { toast } from "sonner";

interface SummaryViewProps {
  appointmentId: string;
  refetch?: () => void;
}

interface RefundDialogProps {
  appointment: Appointment;
  open: boolean;
  onClose: () => void;
  onRefund: () => void;
}

interface CancelDialogProps {
  appointment: Appointment;
  open: boolean;
  onClose: () => void;
  onCancel: () => void;
}

interface CompletionDialogProps {
  appointment: Appointment;
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface NoShowDialogProps {
  appointment: Appointment;
  open: boolean;
  onClose: () => void;
  onNoShow: () => void;
}

const ActionButtons: React.FC<{
  status: AppointmentStatus;
  onCancel: () => void;
  onComplete: () => void;
  onNoShow: () => void;
  onRefund: () => void;
}> = ({ status, onCancel, onComplete, onNoShow, onRefund }) => {
  const { handleCancelAppointment, handleCompleteAppointment, handleNoShowAppointment, handleRefundAppointment } = useAppointmentActions();

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 hover:bg-green-200 border-green-300 text-green-800";
      case "canceled":
        return "bg-red-100 hover:bg-red-200 border-red-300 text-red-800";
      case "completed":
        return "bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-800";
      case "noshow":
        return "bg-yellow-100 hover:bg-yellow-200 border-yellow-300 text-yellow-800";
      case "refunded":
        return "bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-800";
      default:
        return "bg-purple-100 hover:bg-purple-200 border-purple-300 text-purple-800";
    }
  };

  return (
    <>
      {status !== "canceled" && status !== "completed" && status !== "noshow" && status !== "refunded" && (
        <Button variant="outline" className={getStatusColor(status)} onClick={onCancel}>
          Cancel
        </Button>
      )}
      {status === "confirmed" && (
        <Button variant="outline" className={getStatusColor(status)} onClick={onComplete}>
          Complete
        </Button>
      )}
      {status === "confirmed" && (
        <Button variant="outline" className={getStatusColor(status)} onClick={onNoShow}>
          No Show
        </Button>
      )}
      {(status === "completed" || status === "confirmed") && (
        <Button variant="outline" className={getStatusColor(status)} onClick={onRefund}>
          Refund
        </Button>
      )}
    </>
  );
};

const RefundDialog: React.FC<RefundDialogProps> = ({ appointment, open, onClose, onRefund }) => {
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const { handleRefundAppointment } = useAppointmentActions();

  const handleRefund = async () => {
    try {
      await handleRefundAppointment(appointment.id, reason, notes);
      toast.success("Appointment refunded successfully");
      onRefund();
      onClose();
    } catch (error: any) {
      toast.error(`Failed to refund appointment: ${error.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Refund Appointment</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="reason" className="text-right">
              Reason
            </label>
            <Select onValueChange={setReason} defaultValue={reason}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer_dissatisfaction">Customer Dissatisfaction</SelectItem>
                <SelectItem value="service_quality_issue">Service Quality Issue</SelectItem>
                <SelectItem value="scheduling_error">Scheduling Error</SelectItem>
                <SelectItem value="health_concern">Health Concern</SelectItem>
                <SelectItem value="price_dispute">Price Dispute</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="booking_error">Booking Error</SelectItem>
                <SelectItem value="service_unavailable">Service Unavailable</SelectItem>
                <SelectItem value="customer_emergency">Customer Emergency</SelectItem>
                <SelectItem value="customer_no_show">Customer No-Show</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="notes" className="text-right">
              Notes
            </label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleRefund}>
            Refund Appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CancelDialog: React.FC<CancelDialogProps> = ({ appointment, open, onClose, onCancel }) => {
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const { handleCancelAppointment } = useAppointmentActions();

  const handleCancel = async () => {
    try {
      await handleCancelAppointment(appointment.id, reason, notes);
      toast.success("Appointment cancelled successfully");
      onCancel();
      onClose();
    } catch (error: any) {
      toast.error(`Failed to cancel appointment: ${error.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cancel Appointment</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="reason" className="text-right">
              Reason
            </label>
            <Select onValueChange={setReason} defaultValue={reason}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer_request">Customer Request</SelectItem>
                <SelectItem value="staff_unavailable">Staff Unavailable</SelectItem>
                <SelectItem value="service_unavailable">Service Unavailable</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="notes" className="text-right">
              Notes
            </label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCancel}>
            Cancel Appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CompletionDialog: React.FC<CompletionDialogProps> = ({ appointment, open, onClose, onComplete }) => {
  const [notes, setNotes] = useState<string>("");
  const { handleCompleteAppointment } = useAppointmentActions();

  const handleComplete = async () => {
    try {
      await handleCompleteAppointment(appointment.id, notes);
      toast.success("Appointment completed successfully");
      onComplete();
      onClose();
    } catch (error: any) {
      toast.error(`Failed to complete appointment: ${error.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete Appointment</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="notes" className="text-right">
              Notes
            </label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleComplete}>
            Complete Appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const NoShowDialog: React.FC<NoShowDialogProps> = ({ appointment, open, onClose, onNoShow }) => {
  const [notes, setNotes] = useState<string>("");
  const { handleNoShowAppointment } = useAppointmentActions();

  const handleNoShow = async () => {
    try {
      await handleNoShowAppointment(appointment.id, notes);
      toast.success("Appointment marked as no-show");
      onNoShow();
      onClose();
    } catch (error: any) {
      toast.error(`Failed to mark appointment as no-show: ${error.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Mark Appointment as No-Show</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="notes" className="text-right">
              Notes
            </label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleNoShow}>
            Mark as No-Show
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const SummaryView: React.FC<any> = ({ appointmentId, refetch }) => {
  const { appointment, isLoading, refetch: refetchAppointment } = useAppointmentDetails(appointmentId);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showNoShowDialog, setShowNoShowDialog] = useState(false);

  useEffect(() => {
    if (appointmentId) {
      refetchAppointment();
    }
  }, [appointmentId, refetchAppointment]);

  if (isLoading) {
    return <div className="p-6">Loading appointment details...</div>;
  }

  if (!appointment) {
    return <div className="p-6">Appointment not found</div>;
  }

  const handleTriggerRefetch = () => {
    refetchAppointment();
    if (refetch) refetch();
  };

  // Function to format duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Appointment Summary</h2>
          <p className="text-muted-foreground">
            {format(new Date(appointment.start_time), "MMMM d, yyyy • h:mm a")}
          </p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Customer</h3>
              <p className="font-medium">{appointment.customer?.full_name || 'Unknown'}</p>
              <p className="text-sm text-muted-foreground">{appointment.customer?.email || ''}</p>
              <p className="text-sm text-muted-foreground">{appointment.customer?.phone_number || ''}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Appointment Details</h3>
              <div className="flex items-center gap-1 font-medium">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(appointment.start_time), "h:mm a")} - 
                  {format(new Date(appointment.end_time), "h:mm a")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Duration: {formatDuration(appointment.total_duration || 0)}
              </p>
              {appointment.location && (
                <p className="text-sm text-muted-foreground">Location: {appointment.location}</p>
              )}
            </div>
          </div>

          <div className="space-y-4 mt-6">
            <h3 className="font-medium">Services</h3>
            {appointment.bookings
              .filter(booking => booking.service && !booking.package)
              .map((booking) => (
                <div key={booking.id} className="flex justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">{booking.service.name}</p>
                    {booking.employee && (
                      <p className="text-sm text-muted-foreground">Stylist: {booking.employee.name}</p>
                    )}
                  </div>
                  <p className="font-medium">
                    <IndianRupee className="h-3 w-3 inline" />
                    {booking.price_paid}
                  </p>
                </div>
              ))}

            {appointment.bookings
              .filter(booking => booking.package)
              .map((booking) => (
                <div key={booking.id} className="flex flex-col py-2 border-b">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{booking.package.name}</p>
                      {booking.employee && (
                        <p className="text-sm text-muted-foreground">Stylist: {booking.employee.name}</p>
                      )}
                    </div>
                    <p className="font-medium">
                      <IndianRupee className="h-3 w-3 inline" />
                      {booking.price_paid}
                    </p>
                  </div>
                  
                  <div className="mt-2 ml-4 space-y-1">
                    {appointment.bookings
                      .filter(childBooking => 
                        childBooking.package_id === booking.package_id && 
                        childBooking.service
                      )
                      .map(childBooking => (
                        <div key={childBooking.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{childBooking.service.name}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              ))}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>
                <IndianRupee className="h-3 w-3 inline" />
                {appointment.original_total_price || appointment.total_price}
              </span>
            </div>

            {appointment.discount_type !== 'none' && appointment.discount_value > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>
                  Discount
                  {appointment.discount_type === 'percentage' ? ` (${appointment.discount_value}%)` : ''}
                </span>
                <span>
                  -<IndianRupee className="h-3 w-3 inline" />
                  {appointment.discount_type === 'percentage'
                    ? ((appointment.original_total_price || appointment.total_price) * appointment.discount_value / 100).toFixed(2)
                    : appointment.discount_value.toFixed(2)
                  }
                </span>
              </div>
            )}

            {appointment.membership_discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>
                  Membership Discount
                  {appointment.membership_name ? ` (${appointment.membership_name})` : ''}
                </span>
                <span>
                  -<IndianRupee className="h-3 w-3 inline" />
                  {appointment.membership_discount.toFixed(2)}
                </span>
              </div>
            )}

            {appointment.tax_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>
                  <IndianRupee className="h-3 w-3 inline" />
                  {appointment.tax_amount.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between font-medium text-lg pt-2">
              <span>Total</span>
              <span>
                <IndianRupee className="h-4 w-4 inline" />
                {appointment.total_price.toFixed(2)}
              </span>
            </div>
          </div>

          {appointment.notes && (
            <div className="mt-4">
              <h3 className="text-sm font-medium">Notes</h3>
              <p className="text-sm text-muted-foreground mt-1">{appointment.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <div className="space-x-2">
          {/* Add buttons for different statuses */}
          <ActionButtons
            status={appointment.status}
            onCancel={() => setShowCancelDialog(true)}
            onComplete={() => setShowCompleteDialog(true)}
            onNoShow={() => setShowNoShowDialog(true)}
            onRefund={() => setShowRefundDialog(true)}
          />
        </div>
      </div>

      {showRefundDialog && (
        <RefundDialog
          appointment={appointment}
          open={showRefundDialog}
          onClose={() => setShowRefundDialog(false)}
          onRefund={handleTriggerRefetch}
        />
      )}

      {showCancelDialog && (
        <CancelDialog
          appointment={appointment}
          open={showCancelDialog}
          onClose={() => setShowCancelDialog(false)}
          onCancel={handleTriggerRefetch}
        />
      )}

      {showCompleteDialog && (
        <CompletionDialog
          appointment={appointment}
          open={showCompleteDialog}
          onClose={() => setShowCompleteDialog(false)}
          onComplete={handleTriggerRefetch}
        />
      )}

      {showNoShowDialog && (
        <NoShowDialog
          appointment={appointment}
          open={showNoShowDialog}
          onClose={() => setShowNoShowDialog(false)}
          onNoShow={handleTriggerRefetch}
        />
      )}
    </div>
  );
};
