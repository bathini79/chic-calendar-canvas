
import React, { useState } from "react";
import { useAppointmentDetails } from "../hooks/useAppointmentDetails";
import { Button } from "@/components/ui/button";
import { formatRefundReason, formatCurrency } from "../utils/formatters";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { StatusBadge } from "./StatusBadge";
import { useAppointmentActions } from "../hooks/useAppointmentActions";
import { AppointmentStatus } from "../types";

interface SummaryViewProps {
  appointmentId: string;
  onRefundProcessed?: () => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({ 
  appointmentId,
  onRefundProcessed 
}) => {
  const { appointment, refetch } = useAppointmentDetails(appointmentId);
  const { processRefund } = useAppointmentActions();
  
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [refundReason, setRefundReason] = useState<string>("other");
  const [refundNotes, setRefundNotes] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!appointment) {
    return <div>Loading appointment details...</div>;
  }

  const handleBookingSelection = (bookingId: string) => {
    if (selectedBookings.includes(bookingId)) {
      setSelectedBookings(selectedBookings.filter(id => id !== bookingId));
    } else {
      setSelectedBookings([...selectedBookings, bookingId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedBookings.length === appointment.bookings?.length) {
      setSelectedBookings([]);
    } else {
      setSelectedBookings(appointment.bookings?.map(booking => booking.id) || []);
    }
  };

  const handleRefund = async () => {
    if (selectedBookings.length === 0) {
      return;
    }

    setIsProcessing(true);
    try {
      await processRefund(
        appointmentId,
        selectedBookings,
        {
          reason: refundReason,
          notes: refundNotes,
          refundedBy: "staff" // In a real app, this would be the current user's ID
        }
      );
      
      // Reset form
      setSelectedBookings([]);
      setRefundReason("other");
      setRefundNotes("");
      setIsRefundDialogOpen(false);
      
      // Refresh data
      if (refetch) {
        await refetch();
      }
      
      // Notify parent
      if (onRefundProcessed) {
        onRefundProcessed();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Find refunds for this appointment
  const refunds = appointment.transaction_type === 'refund' 
    ? [] // Don't show refunds of refunds
    : appointment.bookings?.filter(booking => booking.status === 'refunded') || [];

  const hasRefunds = refunds.length > 0;
  
  // Calculate if partial refund or full refund
  const isPartialRefund = appointment.status === 'partially_refunded';
  
  // Check if we can refund (not already fully refunded or if it's a refund transaction)
  const canRefund = appointment.status !== 'refunded' && appointment.transaction_type !== 'refund';

  // Calculate total refunded amount
  const refundedAmount = appointment.bookings?.reduce((total, booking) => {
    if (booking.status === 'refunded') {
      return total + (booking.price_paid || 0);
    }
    return total;
  }, 0) || 0;

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Is the transaction a refund?
  const isRefundTransaction = appointment.transaction_type === 'refund';
  
  // Calculate the tax portion
  const taxAmount = appointment.tax_amount || 0;
  const subtotalBeforeTax = appointment.total_price - taxAmount;
  
  // Customer info display
  const customerInfo = appointment.customer ? (
    <div className="mb-6">
      <h4 className="text-lg font-medium mb-2">Customer Information</h4>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="font-medium">Name:</p>
          <p>{appointment.customer.full_name}</p>
        </div>
        <div>
          <p className="font-medium">Email:</p>
          <p>{appointment.customer.email}</p>
        </div>
        <div>
          <p className="font-medium">Phone:</p>
          <p>{appointment.customer.phone_number}</p>
        </div>
      </div>
    </div>
  ) : null;

  // Tax info display
  const taxInfo = taxAmount !== 0 && (
    <div className="flex justify-between text-sm mb-2">
      <span>Tax {appointment.tax?.name ? `(${appointment.tax.name})` : ''}</span>
      <span>{formatCurrency(taxAmount)}</span>
    </div>
  );

  // Membership discount info
  const membershipInfo = appointment.membership_discount > 0 && appointment.membership_name && (
    <div className="flex justify-between text-sm text-green-600 mb-2">
      <span>Membership Discount ({appointment.membership_name})</span>
      <span>-{formatCurrency(appointment.membership_discount)}</span>
    </div>
  );
  
  // Coupon discount info
  const couponInfo = appointment.coupon_name && (
    <div className="flex justify-between text-sm text-green-600 mb-2">
      <span>Coupon ({appointment.coupon_name})</span>
      <span>-{formatCurrency(appointment.coupon_amount || 0)}</span>
    </div>
  );
  
  // Manual discount info
  const discountInfo = appointment.discount_type !== 'none' && appointment.discount_value > 0 && (
    <div className="flex justify-between text-sm text-green-600 mb-2">
      <span>
        Discount 
        {appointment.discount_type === 'percentage' ? ` (${appointment.discount_value}%)` : ''}
      </span>
      <span>-{formatCurrency(
        appointment.discount_type === 'percentage' 
          ? (subtotalBeforeTax * (appointment.discount_value / 100))
          : appointment.discount_value
      )}</span>
    </div>
  );

  // Helper function to render status with badge
  const renderStatus = (status: AppointmentStatus) => (
    <div className="flex items-center">
      <StatusBadge status={status} />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Transaction Status */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-sm text-gray-500">
            {isRefundTransaction ? "Refund" : "Transaction"} Date: {formatDate(appointment.created_at || '')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          {renderStatus(appointment.status)}
        </div>
      </div>

      {/* Customer Information */}
      {customerInfo}

      {/* Items */}
      <div>
        <h4 className="text-lg font-medium mb-3">
          {isRefundTransaction ? "Refunded Items" : "Items"}
        </h4>

        <div className="border rounded-md overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {canRefund && (
                  <th className="px-4 py-2 text-left">
                    <input 
                      type="checkbox"
                      checked={selectedBookings.length === appointment.bookings?.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                <th className="px-4 py-2 text-left">Service</th>
                <th className="px-4 py-2 text-left">Provider</th>
                <th className="px-4 py-2 text-right">Amount</th>
                {hasRefunds && <th className="px-4 py-2 text-left">Status</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {appointment.bookings?.map((booking) => (
                <tr key={booking.id} className={booking.status === 'refunded' ? "bg-gray-50" : ""}>
                  {canRefund && (
                    <td className="px-4 py-3">
                      {booking.status !== 'refunded' && (
                        <input 
                          type="checkbox"
                          checked={selectedBookings.includes(booking.id)}
                          onChange={() => handleBookingSelection(booking.id)}
                        />
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {booking.service ? booking.service.name : booking.package ? booking.package.name : 'Unknown'}
                  </td>
                  <td className="px-4 py-3">
                    {booking.employee ? booking.employee.name : 'Any Stylist'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(booking.price_paid || 0)}
                  </td>
                  {hasRefunds && (
                    <td className="px-4 py-3">
                      {booking.status === 'refunded' ? (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-800">
                          Refunded
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800">
                          Paid
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Summary */}
      <div>
        <h4 className="text-lg font-medium mb-3">Payment Summary</h4>
        
        <div className="border rounded-md p-4 space-y-4">
          <div className="space-y-2">
            {/* Subtotal */}
            <div className="flex justify-between text-sm mb-2">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotalBeforeTax)}</span>
            </div>
            
            {/* Tax */}
            {taxInfo}
            
            {/* Membership discount */}
            {membershipInfo}
            
            {/* Coupon discount */}
            {couponInfo}
            
            {/* Manual discount */}
            {discountInfo}

            {/* Refunded amount if applicable */}
            {isPartialRefund && !isRefundTransaction && (
              <div className="flex justify-between text-sm text-red-600 mb-2">
                <span>Amount Refunded</span>
                <span>-{formatCurrency(refundedAmount)}</span>
              </div>
            )}

            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span className={isRefundTransaction ? "text-red-600" : ""}>
                  {formatCurrency(appointment.total_price)}
                </span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="flex justify-between text-sm mt-2">
              <span>Payment Method</span>
              <span className="capitalize">{appointment.payment_method}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Refund information if this is a refund */}
      {isRefundTransaction && appointment.refund_reason && (
        <div>
          <h4 className="text-lg font-medium mb-3">Refund Details</h4>
          <div className="border rounded-md p-4 space-y-3">
            <div>
              <span className="text-sm font-medium">Reason:</span> 
              <span className="ml-2">{formatRefundReason(appointment.refund_reason)}</span>
            </div>
            {appointment.refund_notes && (
              <div>
                <span className="text-sm font-medium">Notes:</span>
                <p className="text-sm mt-1">{appointment.refund_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Refund Button */}
      {canRefund && (
        <div className="mt-4 flex justify-end">
          <Button 
            variant="outline" 
            onClick={() => setIsRefundDialogOpen(true)}
            disabled={appointment.status === 'refunded'}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            Process Refund
          </Button>
        </div>
      )}

      {/* Refund Dialog */}
      <AlertDialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Process Refund</AlertDialogTitle>
            <AlertDialogDescription>
              Select the items to refund and provide a reason for the refund.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-base font-medium mb-2 block">Select items to refund</Label>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">
                        <input 
                          type="checkbox"
                          checked={selectedBookings.length === appointment.bookings?.filter(b => b.status !== 'refunded').length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-2 text-left">Service</th>
                      <th className="px-4 py-2 text-left">Provider</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {appointment.bookings
                      ?.filter(booking => booking.status !== 'refunded')
                      .map((booking) => (
                      <tr key={booking.id}>
                        <td className="px-4 py-3">
                          <input 
                            type="checkbox"
                            checked={selectedBookings.includes(booking.id)}
                            onChange={() => handleBookingSelection(booking.id)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          {booking.service ? booking.service.name : booking.package ? booking.package.name : 'Unknown'}
                        </td>
                        <td className="px-4 py-3">
                          {booking.employee ? booking.employee.name : 'Any Stylist'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(booking.price_paid || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <Label className="text-base font-medium mb-2 block">Refund reason</Label>
              <Select value={refundReason} onValueChange={setRefundReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer_dissatisfaction">Customer Dissatisfaction</SelectItem>
                  <SelectItem value="service_quality_issue">Service Quality Issue</SelectItem>
                  <SelectItem value="scheduling_error">Scheduling Error</SelectItem>
                  <SelectItem value="health_concern">Health Concern</SelectItem>
                  <SelectItem value="price_dispute">Price Dispute</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-base font-medium mb-2 block">Notes (optional)</Label>
              <Textarea 
                value={refundNotes}
                onChange={(e) => setRefundNotes(e.target.value)}
                placeholder="Add any additional details about this refund."
                rows={3}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRefund}
              disabled={selectedBookings.length === 0 || isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? "Processing..." : "Process Refund"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
