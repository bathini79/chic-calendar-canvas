
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  CreditCard, 
  Banknote,
  MoreVertical,
  PencilLine,
  FileText,
  Mail,
  Printer,
  Download,
  Ban,
  Clock,
  Package,
  MapPin
} from "lucide-react";
import { format } from 'date-fns';
import { useAppointmentDetails } from '../hooks/useAppointmentDetails';
import { formatPrice } from '@/lib/utils';

export interface SummaryViewProps {
  appointmentId: string;
  customer?: {
    id: string;
    full_name: string;
    email: string;
    phone_number?: string;
  };
  totalPrice?: number;
  items?: {
    id: string;
    name: string;
    price: number;
    type: string;
    employee?: {
      id: string;
      name: string;
    };
    duration?: number;
  }[];
  paymentMethod?: 'cash' | 'online' | 'card';
  onAddAnother?: () => void;
  receiptNumber?: string;
  taxAmount?: number;
  subTotal?: number;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  appointmentId,
  customer,
  totalPrice,
  items,
  paymentMethod = 'cash',
  onAddAnother,
  receiptNumber,
  taxAmount = 0,
  subTotal = 0
}) => {
  const { appointment, isLoading } = useAppointmentDetails(appointmentId || null);
  const [summaryData, setSummaryData] = useState<{
    customer: { id: string; full_name: string; email: string; phone_number?: string } | null;
    items: any[];
    totalPrice: number;
    paymentMethod: 'cash' | 'online' | 'card';
    taxAmount: number;
    subTotal: number;
    membershipName?: string;
    membershipDiscount?: number;
  }>({
    customer: null,
    items: [],
    totalPrice: 0,
    paymentMethod: 'cash',
    taxAmount: 0,
    subTotal: 0
  });

  useEffect(() => {
    if (appointmentId && appointment) {
      // Use appointment data
      const items = appointment.bookings.map(booking => ({
        id: booking.id,
        name: booking.service?.name || booking.package?.name || 'Unknown',
        price: booking.price_paid,
        type: booking.service_id ? 'service' : 'package',
        employee: booking.employee,
        duration: booking.service?.duration || booking.package?.duration
      }));

      setSummaryData({
        customer: appointment.customer || null,
        items,
        totalPrice: appointment.total_price,
        paymentMethod: (appointment.payment_method as 'cash' | 'online' | 'card') || 'cash',
        taxAmount: appointment.tax_amount || 0,
        subTotal: items.reduce((sum, item) => sum + item.price, 0),
        membershipName: appointment.membership_name,
        membershipDiscount: appointment.membership_discount
      });
    } else if (customer && items && totalPrice !== undefined) {
      // Use provided props
      setSummaryData({
        customer,
        items,
        totalPrice,
        paymentMethod: paymentMethod || 'cash',
        taxAmount: taxAmount || 0,
        subTotal: subTotal || 0
      });
    }
  }, [appointment, appointmentId, customer, items, totalPrice, paymentMethod, taxAmount, subTotal]);

  // Generate a receipt-like view
  const renderReceipt = () => {
    if (isLoading || (!summaryData.customer && !appointment)) {
      return <div>Loading...</div>;
    }

    const { customer, items, totalPrice, paymentMethod, taxAmount, subTotal, membershipName, membershipDiscount } = summaryData;

    if (!customer) return <div>No customer information</div>;

    return (
      <Card className="bg-white h-full border">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex-1">
              <div className="inline-flex items-center px-2.5 py-1 rounded bg-green-100 text-green-700 text-sm font-medium mb-2">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Completed Sale
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-base font-semibold">
              {customer.full_name || 'No name provided'}
            </h4>
            <p className="text-gray-600">{customer.email || 'No email provided'}</p>
            {customer.phone_number && (
              <p className="text-gray-600">{customer.phone_number}</p>
            )}
          </div>

          <div className="overflow-y-auto">
            <h4 className="font-medium mb-4">Items</h4>
            
            {items && items.map((item, idx) => (
              <div key={idx} className="py-2 flex justify-between items-start border-b">
                <div className="flex-1">
                  <p className="font-medium text-sm line-clamp-1">
                    {item.type === 'package' && <Package className="h-4 w-4 inline mr-1" />}
                    {item.name}
                  </p>
                  {item.employee && (
                    <p className="text-xs text-gray-500">
                      Stylist: {item.employee.name}
                    </p>
                  )}
                  {item.duration && (
                    <p className="text-xs text-gray-500">
                      Duration: {item.duration} minutes
                    </p>
                  )}
                </div>
                <p className="text-right text-gray-900">
                  {formatPrice(item.price)}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-1 pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatPrice(subTotal)}</span>
            </div>
            
            {taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>{formatPrice(taxAmount)}</span>
              </div>
            )}
            
            {membershipName && membershipDiscount && membershipDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Membership Discount ({membershipName})</span>
                <span>-{formatPrice(membershipDiscount)}</span>
              </div>
            )}
            
            {subTotal !== totalPrice && !membershipDiscount && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-{formatPrice(subTotal - totalPrice + (taxAmount || 0))}</span>
              </div>
            )}
            
            <div className="flex justify-between text-lg font-bold pt-2">
              <span>Total</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex justify-between text-xs">
              <span className="capitalize">
                Paid with {paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'card' ? 'Card' : 'Online'}
              </span>
              <div className="flex items-center">
                {paymentMethod === 'cash' ? (
                  <Banknote className="h-4 w-4 mr-1" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-1" />
                )}
                {formatPrice(totalPrice)}
              </div>
            </div>
          </div>
          
          {receiptNumber && (
            <div className="pt-2 text-center text-xs text-gray-500">
              Receipt #: {receiptNumber}
            </div>
          )}
          
          {onAddAnother && (
            <div className="flex justify-center mt-4">
              <Button onClick={onAddAnother} className="mx-auto">
                Add Another
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return renderReceipt();
};
