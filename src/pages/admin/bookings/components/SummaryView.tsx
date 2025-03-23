
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { 
  Ban, 
  Banknote, 
  Calendar, 
  Check, 
  Clock, 
  CreditCard, 
  File, 
  FileCheck, 
  FileMinus, 
  FileWarning, 
  MessagesSquare, 
  Tag, 
  User, 
  UserRound,
  Undo
} from "lucide-react";
import { AppointmentStatus, Customer, RefundData } from "../types";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface SelectedItem {
  id: string;
  name: string;
  price: number;
  type: 'service' | 'package' | 'membership';
}

interface SummaryViewProps {
  appointmentId?: string;
  customer: {
    id: string;
    full_name: string;
    email: string;
    phone_number?: string;
  };
  totalPrice: number;
  items: SelectedItem[];
  paymentMethod: 'cash' | 'card' | 'online';
  onAddAnother: () => void;
  receiptNumber?: string;
  taxAmount?: number;
  subTotal?: number;
  couponDiscount?: number;
  membershipDiscount?: number;
  membershipName?: string;
}

export function SummaryView({ 
  appointmentId, 
  customer, 
  totalPrice, 
  items, 
  paymentMethod, 
  onAddAnother,
  receiptNumber,
  taxAmount = 0,
  subTotal = 0,
  couponDiscount = 0,
  membershipDiscount = 0,
  membershipName = ""
}: SummaryViewProps) {
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [actionType, setActionType] = useState<'cancel' | 'complete' | 'noshow' | 'refund'>('complete');
  const [refundReason, setRefundReason] = useState<string>('customer_dissatisfaction');
  const [refundNotes, setRefundNotes] = useState('');
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [appointmentDetails, setAppointmentDetails] = useState<any | null>(null);
  const [isPartialRefund, setIsPartialRefund] = useState(false);
  const regularDiscount = subTotal - totalPrice - couponDiscount - membershipDiscount + taxAmount;

  const { data: transactionDetails, isLoading: isTransactionLoading } = useQuery({
    queryKey: ['appointment-transaction', appointmentId],
    queryFn: async () => {
      if (!appointmentId) return null;
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:profiles(*),
          bookings(
            *,
            service:services(*),
            package:packages(*),
            employee:employees(*)
          )
        `)
        .eq('id', appointmentId)
        .single();
        
      if (error) throw error;
      return data;
    },
    enabled: !!appointmentId
  });

  // Use either fetched transaction details or provided props
  const displayDetails = transactionDetails || {
    customer,
    total_price: totalPrice,
    status: 'confirmed',
    payment_method: paymentMethod,
    tax_amount: taxAmount,
  };

  // Handle appointment actions
  const handleAction = (type: 'cancel' | 'complete' | 'noshow' | 'refund') => {
    setActionType(type);
    if (type === 'refund') {
      setShowRefundDialog(true);
    } else {
      setShowActionDialog(true);
    }
  };

  const calculateTotal = () => {
    if (transactionDetails) {
      let total = transactionDetails.total_price || 0;
      return total;
    }
    return totalPrice;
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Transaction Summary</CardTitle>
            {receiptNumber && (
              <p className="text-sm text-muted-foreground mt-1">Receipt: {receiptNumber}</p>
            )}
          </div>
          {appointmentId && transactionDetails && (
            <StatusBadge status={transactionDetails.status} />
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Information */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <UserRound className="h-5 w-5" /> Customer Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{displayDetails.customer?.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{displayDetails.customer?.email}</p>
              </div>
              {displayDetails.customer?.phone_number && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{displayDetails.customer?.phone_number}</p>
                </div>
              )}
            </div>
          </div>

          {/* Transaction Details */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <FileCheck className="h-5 w-5" /> Transaction Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">
                  {transactionDetails ? 
                    formatDate(new Date(transactionDetails.created_at)) : 
                    formatDate(new Date())}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="font-medium capitalize">
                  {displayDetails.payment_method || paymentMethod}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-medium">
                  {formatPrice(calculateTotal())}
                </p>
              </div>
              {appointmentId && (
                <div>
                  <p className="text-sm text-muted-foreground">Transaction ID</p>
                  <p className="font-medium text-xs">{appointmentId}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items Purchased */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <File className="h-5 w-5" /> Items
            </h3>
            <div className="border rounded-md">
              <div className="p-3 bg-muted/50 border-b grid grid-cols-12 text-sm font-medium">
                <div className="col-span-6">Item</div>
                <div className="col-span-3">Type</div>
                <div className="col-span-3 text-right">Price</div>
              </div>
              <div className="divide-y">
                {transactionDetails && transactionDetails.bookings ? (
                  transactionDetails.bookings.map((booking: any) => (
                    <div key={booking.id} className="p-3 grid grid-cols-12 items-center">
                      <div className="col-span-6 font-medium">
                        {booking.service?.name || booking.package?.name}
                      </div>
                      <div className="col-span-3 text-sm">
                        {booking.service ? 'Service' : 'Package'}
                      </div>
                      <div className="col-span-3 text-right">
                        {formatPrice(booking.price_paid)}
                      </div>
                    </div>
                  ))
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="p-3 grid grid-cols-12 items-center">
                      <div className="col-span-6 font-medium">{item.name}</div>
                      <div className="col-span-3 text-sm capitalize">{item.type}</div>
                      <div className="col-span-3 text-right">{formatPrice(item.price)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="space-y-2 border-t pt-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <CreditCard className="h-5 w-5" /> Price Breakdown
            </h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subTotal > 0 ? subTotal : (calculateTotal() + regularDiscount))}</span>
              </div>
              
              {(transactionDetails?.tax_amount || taxAmount > 0) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatPrice(transactionDetails?.tax_amount || taxAmount)}</span>
                </div>
              )}
              
              {(transactionDetails?.discount_type !== 'none' || regularDiscount > 0) && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center">
                    <Percent className="mr-2 h-4 w-4" />
                    Discount
                    {transactionDetails?.discount_type === 'percentage' && 
                      ` (${transactionDetails.discount_value}%)`}
                  </span>
                  <span>-{formatPrice(regularDiscount > 0 ? regularDiscount : 
                    (transactionDetails?.original_total_price || 0) - 
                    (transactionDetails?.total_price || 0))}</span>
                </div>
              )}
              
              {(couponDiscount > 0 || transactionDetails?.coupon_id) && (
                <div className="flex justify-between text-green-600">
                  <span>Coupon Discount</span>
                  <span>-{formatPrice(couponDiscount)}</span>
                </div>
              )}
              
              {(membershipDiscount > 0 || transactionDetails?.membership_discount) && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center">
                    <Tag className="mr-2 h-4 w-4" />
                    Membership Discount
                    {(membershipName || transactionDetails?.membership_name) && 
                      ` (${membershipName || transactionDetails?.membership_name})`}
                  </span>
                  <span>-{formatPrice(membershipDiscount || transactionDetails?.membership_discount || 0)}</span>
                </div>
              )}
              
              <Separator className="my-2" />
              
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatPrice(calculateTotal())}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        {onAddAnother && (
          <Button onClick={onAddAnother} variant="outline">
            Add Another Transaction
          </Button>
        )}
      </div>
    </div>
  );
}
