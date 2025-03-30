
import React, { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "../utils/formatters";
import { format } from "date-fns";
import { Check, LucideUser } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Appointment } from "../types";
import { useAppointmentDetails } from "@/hooks/use-appointment-details";
import { Button } from "@/components/ui/button";
import { useAppointmentActions } from "../hooks/useAppointmentActions";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface SummaryViewProps {
  appointmentId: string;
  customer?: {
    id: string;
    full_name: string;
    email: string;
    phone_number?: string;
  };
  totalPrice?: number;
  items?: Array<{
    id: string;
    name: string;
    price: number;
    type: string;
    employee?: {
      id: string;
      name: string;
    };
    duration?: number;
  }>;
  paymentMethod?: string;
  onAddAnother?: () => void;
  receiptNumber?: string;
  taxAmount?: number;
  subTotal?: number;
  membershipName?: string;
  membershipDiscount?: number;
  children?: React.ReactNode;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  appointmentId,
  children,
  onAddAnother,
}) => {
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundNotes, setRefundNotes] = useState("");
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [refundBookings, setRefundBookings] = useState<any[]>([]);

  const {
    data: appointment,
    isLoading,
    refetch,
    isRefunded,
    isCompleted,
  } = useAppointmentDetails(appointmentId);

  const { processRefund } = useAppointmentActions();

  useEffect(() => {
    if (appointment?.bookings) {
      const bookingIds = appointment.bookings
        .filter((booking: any) => booking.status !== "refunded")
        .map((b: any) => b.id);
      setSelectedBookings(bookingIds);

      const bookingsForRefund = appointment.bookings.filter(
        (booking: any) => booking.status !== "refunded"
      );
      setRefundBookings(bookingsForRefund);
    }
  }, [appointment]);

  const toggleBookingSelection = (bookingId: string) => {
    setSelectedBookings((prev) =>
      prev.includes(bookingId)
        ? prev.filter((id) => id !== bookingId)
        : [...prev, bookingId]
    );
  };

  const handleRefund = async () => {
    if (!appointmentId) return;

    try {
      const userId = localStorage.getItem("userId") || "system";

      const refundData = {
        reason: refundReason || "other",
        notes: refundNotes,
        refundedBy: userId,
      };

      const result = await processRefund(
        appointmentId,
        selectedBookings,
        refundData
      );

      if (result) {
        setIsRefundDialogOpen(false);
        setRefundReason("");
        setRefundNotes("");
        await refetch();
      }
    } catch (error) {
      console.error("Refund error:", error);
      toast.error("Failed to process refund");
    }
  };

  const calculateTotalRefunded = () => {
    if (!appointment?.bookings) return 0;

    return appointment.bookings
      .filter((booking: any) => booking.status === "refunded")
      .reduce((total: number, booking: any) => total + booking.price_paid, 0);
  };

  const totalRefunded = calculateTotalRefunded();
  
  const formatDateTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return format(date, "MMM d, yyyy 'at' h:mm a");
  };

  if (isLoading || !appointment) {
    return <div className="p-6">Loading appointment details...</div>;
  }

  // Extract customer details
  const customer = appointment.customer || {};
  
  // Calculate total amount
  let totalAmount = Number(appointment.total_price) || 0;
  
  // Get all bookings
  const bookings = appointment.bookings || [];
  
  // Extract tax details
  const taxRate = appointment.tax?.percentage || 0;
  const taxName = appointment.tax?.name || 'Tax';
  
  // Calculate subtotal and tax amount correctly
  const taxAmount = Number(appointment.tax_amount) || 0;
  
  // Get original price before tax
  const subTotal = totalAmount - taxAmount;
  
  // Get membership details if available
  const membershipName = appointment.membership_name || '';
  const membershipDiscount = Number(appointment.membership_discount) || 0;
  
  // Get discount details
  const discountType = appointment.discount_type || 'none';
  const discountValue = Number(appointment.discount_value) || 0;
  const discountApplied = discountType !== 'none' && discountValue > 0;
  
  // Calculate how much has been refunded
  const totalRefundedAmount = totalRefunded;
  const remainingAmount = totalAmount - totalRefundedAmount;

  // Determine if this is a partial refund
  const isPartiallyRefunded = 
    totalRefundedAmount > 0 && totalRefundedAmount < totalAmount;

  // Get current appointment status
  const status = appointment.status || 'pending';

  // Prepare items for display
  const items = bookings.map((booking: any) => {
    const service = booking.service;
    const packageInfo = booking.package;
    
    return {
      id: booking.id,
      name: service?.name || packageInfo?.name || "Unknown service",
      price: booking.price_paid || 0,
      type: service ? 'service' : 'package',
      employee: booking.employee,
      status: booking.status,
      duration: service?.duration || packageInfo?.duration,
    };
  });

  return (
    <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
      <div className="flex justify-between">
        <h3 className="text-xl font-semibold">Receipt</h3>
        <div className="text-sm text-muted-foreground">
          {formatDateTime(appointment.created_at || '')}
        </div>
      </div>

      <div>
        <div className="flex flex-col">
          <span className="font-medium text-lg">{customer.full_name}</span>
          <span className="text-muted-foreground">{customer.email}</span>
          {customer.phone_number && (
            <span className="text-muted-foreground">{customer.phone_number}</span>
          )}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex justify-between font-medium">
          <span>Service</span>
          <span>Price</span>
        </div>

        {items.map((item) => (
          <div
            key={item.id}
            className="flex justify-between items-start pb-2 border-b border-gray-100"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span>{item.name}</span>
                {item.status === "refunded" && (
                  <Badge variant="destructive" className="text-xs">
                    Refunded
                  </Badge>
                )}
              </div>
              {item.employee && (
                <div className="flex items-center text-xs text-muted-foreground gap-1">
                  <LucideUser className="h-3 w-3" />
                  <span>{item.employee.name}</span>
                </div>
              )}
              {item.duration && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <span>{item.duration} min</span>
                </div>
              )}
            </div>
            <span className={item.status === "refunded" ? "line-through" : ""}>
              {formatCurrency(item.price)}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-2">
        {/* Tax information */}
        {taxAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span>{taxName} ({taxRate}%)</span>
            <span>
              {isRefunded ? (
                <span className="line-through">{formatCurrency(taxAmount)}</span>
              ) : (
                formatCurrency(isPartiallyRefunded ? 
                  (taxAmount * (remainingAmount / totalAmount)) : taxAmount)
              )}
            </span>
          </div>
        )}
        
        {/* Original amount / Subtotal */}
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>
            {isRefunded ? (
              <span className="line-through">{formatCurrency(subTotal)}</span>
            ) : (
              formatCurrency(isPartiallyRefunded ? 
                (subTotal * (remainingAmount / totalAmount)) : subTotal)
            )}
          </span>
        </div>

        {/* Membership discount if applicable */}
        {membershipDiscount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>{membershipName} Discount</span>
            <span>
              {isRefunded ? (
                <span className="line-through">
                  -{formatCurrency(membershipDiscount)}
                </span>
              ) : (
                '-' + formatCurrency(isPartiallyRefunded ? 
                  (membershipDiscount * (remainingAmount / totalAmount)) : 
                  membershipDiscount)
              )}
            </span>
          </div>
        )}

        {/* Discount if applicable */}
        {discountApplied && (
          <div className="flex justify-between text-sm text-green-600">
            <span>
              Discount{" "}
              {discountType === "percentage"
                ? `(${discountValue}%)`
                : ""}
            </span>
            <span>
              {isRefunded ? (
                <span className="line-through">
                  -{formatCurrency(
                    discountType === "percentage"
                      ? (subTotal * discountValue) / 100
                      : discountValue
                  )}
                </span>
              ) : (
                '-' + formatCurrency(
                  isPartiallyRefunded ? 
                    ((discountType === "percentage" 
                      ? (subTotal * discountValue) / 100 
                      : discountValue) * (remainingAmount / totalAmount)) : 
                    (discountType === "percentage" 
                      ? (subTotal * discountValue) / 100 
                      : discountValue)
                )
              )}
            </span>
          </div>
        )}

        {/* Total amount */}
        <div className="flex justify-between font-bold text-lg pt-2 border-t">
          <span>Total</span>
          <span>
            {isRefunded ? (
              <span className="line-through">{formatCurrency(totalAmount)}</span>
            ) : isPartiallyRefunded ? (
              formatCurrency(remainingAmount)
            ) : (
              formatCurrency(totalAmount)
            )}
          </span>
        </div>

        {/* Show refunded amount if applicable */}
        {isPartiallyRefunded && (
          <div className="flex justify-between text-sm text-red-600">
            <span>Refunded Amount</span>
            <span>{formatCurrency(totalRefundedAmount)}</span>
          </div>
        )}
        
        {isRefunded && (
          <div className="flex justify-between text-sm text-red-600">
            <span>Refunded</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
        )}

        {/* Payment method */}
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Payment Method</span>
          <span className="capitalize">{appointment.payment_method || "Cash"}</span>
        </div>

        {/* Status */}
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Status</span>
          <span className="capitalize">{status}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        {!isRefunded && !isPartiallyRefunded && isCompleted && (
          <Button
            variant="outline"
            onClick={() => setIsRefundDialogOpen(true)}
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            Refund
          </Button>
        )}
        {isPartiallyRefunded && (
          <Button
            variant="outline"
            onClick={() => setIsRefundDialogOpen(true)}
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            Refund Remaining
          </Button>
        )}
        {onAddAnother && (
          <Button onClick={onAddAnother}>New Appointment</Button>
        )}
        {children}
      </div>

      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              Select the services to refund and provide a reason. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            <div>
              <h3 className="font-medium mb-2">Select items to refund</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {refundBookings.map((booking) => {
                  const service = booking.service;
                  const packageInfo = booking.package;
                  const itemName =
                    service?.name || packageInfo?.name || "Unknown service";

                  return (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between py-1 border-b"
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedBookings.includes(booking.id)}
                          onChange={() => toggleBookingSelection(booking.id)}
                          id={`booking-${booking.id}`}
                          className="rounded border-gray-300"
                        />
                        <label
                          htmlFor={`booking-${booking.id}`}
                          className="text-sm"
                        >
                          {itemName}
                        </label>
                      </div>
                      <span className="text-sm">
                        {formatCurrency(booking.price_paid || 0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="reason" className="text-sm font-medium">
                Reason for refund
              </label>
              <Select
                value={refundReason}
                onValueChange={setRefundReason}
                required
              >
                <SelectTrigger id="reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer_dissatisfaction">
                    Customer Dissatisfaction
                  </SelectItem>
                  <SelectItem value="service_quality_issue">
                    Service Quality Issue
                  </SelectItem>
                  <SelectItem value="scheduling_error">
                    Scheduling Error
                  </SelectItem>
                  <SelectItem value="health_concern">Health Concern</SelectItem>
                  <SelectItem value="price_dispute">Price Dispute</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">
                Additional Notes
              </label>
              <Textarea
                id="notes"
                value={refundNotes}
                onChange={(e) => setRefundNotes(e.target.value)}
                placeholder="Add any additional notes about the refund"
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRefundDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRefund}
              disabled={selectedBookings.length === 0 || !refundReason}
            >
              Process Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
