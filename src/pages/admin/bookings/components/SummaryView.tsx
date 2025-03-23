
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
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
  Percent,
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

const formatDate = (date: Date) => {
  return format(date, 'MMM dd, yyyy h:mm a');
};

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
      
      // Add default values for potentially missing fields
      return {
        ...data,
        membership_discount: data.membership_discount || 0,
        membership_name: data.membership_name || '',
        tax_amount: data.tax_amount || 0,
        discount_type: data.discount_type || 'none',
        discount_value: data.discount_value || 0,
        original_total_price: data.original_total_price || (data.total_price || 0)
      };
    },
    enabled: !!appointmentId
  });

  const displayDetails = transactionDetails || {
    customer,
    total_price: totalPrice,
    status: 'confirmed',
    payment_method: paymentMethod,
    tax_amount: taxAmount,
    membership_discount: membershipDiscount,
    membership_name: membershipName,
    discount_type: 'none',
    discount_value: 0,
    original_total_price: totalPrice
  };

  const calculateTotal = () => {
    if (transactionDetails) {
      return transactionDetails.total_price || 0;
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

          <div className="space-y-2 border-t pt-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <CreditCard className="h-5 w-5" /> Price Breakdown
            </h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subTotal > 0 ? subTotal : (calculateTotal() + (displayDetails.membership_discount || 0)))}</span>
              </div>
              
              {(displayDetails.tax_amount || taxAmount > 0) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatPrice(displayDetails.tax_amount || taxAmount)}</span>
                </div>
              )}
              
              {(displayDetails.discount_type !== 'none' && displayDetails.discount_type) && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center">
                    <Percent className="mr-2 h-4 w-4" />
                    Discount
                    {displayDetails.discount_type === 'percentage' && 
                      ` (${displayDetails.discount_value}%)`}
                  </span>
                  <span>-{formatPrice(
                    (displayDetails.original_total_price || 0) - 
                    (displayDetails.total_price || 0) -
                    (displayDetails.membership_discount || 0)
                  )}</span>
                </div>
              )}
              
              {(couponDiscount > 0 || transactionDetails?.coupon_id) && (
                <div className="flex justify-between text-green-600">
                  <span>Coupon Discount</span>
                  <span>-{formatPrice(couponDiscount)}</span>
                </div>
              )}
              
              {((membershipDiscount > 0) || (displayDetails.membership_discount && displayDetails.membership_discount > 0)) && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center">
                    <Tag className="mr-2 h-4 w-4" />
                    Membership Discount
                    {(membershipName || displayDetails.membership_name) && 
                      ` (${membershipName || displayDetails.membership_name})`}
                  </span>
                  <span>-{formatPrice(membershipDiscount || displayDetails.membership_discount || 0)}</span>
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
