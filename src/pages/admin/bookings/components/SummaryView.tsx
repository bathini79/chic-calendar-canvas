
import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice, formatPhoneNumber, formatDate } from "@/lib/utils";
import { useAppointmentDetails } from "../hooks/useAppointmentDetails";
import { format } from "date-fns";
import { 
  Receipt, 
  Clock, 
  CalendarIcon, 
  CreditCard,
  Banknote,  // Changed from 'Cash' to 'Banknote' which is available in lucide-react
  Phone,
  Mail,
  User,
  Tag
} from "lucide-react";
import { SummaryViewProps } from "../types";
import { Badge } from "@/components/ui/badge";

export function SummaryView({
  appointmentId,
  customer,
  totalPrice,
  items,
  paymentMethod,
  onAddAnother,
  receiptNumber,
  taxAmount = 0,
  subTotal,
  membershipName,
  membershipDiscount = 0
}: SummaryViewProps) {
  const { appointment, isLoading } = useAppointmentDetails(appointmentId);

  // Use either direct props or appointment data
  const displayData = useMemo(() => {
    // If direct props are provided, use them (membership sale case)
    if (customer && totalPrice !== undefined && items) {
      return {
        customer,
        totalPrice,
        items,
        paymentMethod,
        taxAmount,
        subTotal,
        membershipName,
        membershipDiscount,
        // Set default values for appointment-specific fields
        status: "confirmed" as const,
        start_time: new Date().toISOString(),
        discount_type: "none" as const,
        discount_value: 0
      };
    }
    
    // Otherwise use appointment data if available
    if (appointment) {
      return {
        customer: appointment.customer,
        totalPrice: appointment.total_price,
        items: appointment.bookings.map(booking => ({
          id: booking.id,
          name: booking.service?.name || booking.package?.name || "",
          price: booking.price_paid,
          type: booking.service_id ? "service" : "package",
          employee: booking.employee ? {
            id: booking.employee.id,
            name: booking.employee.name
          } : undefined,
          duration: booking.service?.duration || booking.package?.duration
        })),
        paymentMethod: appointment.payment_method as 'cash' | 'card' | 'online',
        taxAmount: appointment.tax_amount || 0,
        membershipName: appointment.membership_name || undefined,
        membershipDiscount: appointment.membership_discount || 0,
        status: appointment.status,
        start_time: appointment.start_time,
        discount_type: appointment.discount_type,
        discount_value: appointment.discount_value,
        original_total_price: appointment.original_total_price
      };
    }
    
    // Default empty state
    return null;
  }, [appointment, customer, totalPrice, items, paymentMethod, taxAmount, subTotal, membershipName, membershipDiscount]);

  if (isLoading || !displayData) {
    return <div className="p-4">Loading...</div>;
  }

  const getPaymentIcon = () => {
    switch (displayData.paymentMethod) {
      case "card":
        return <CreditCard className="h-4 w-4 text-gray-500" />;
      case "cash":
        return <Banknote className="h-4 w-4 text-gray-500" />; // Changed from Cash to Banknote
      default:
        return <CreditCard className="h-4 w-4 text-gray-500" />;
    }
  };

  const calculateDiscount = () => {
    if (!displayData.discount_type || displayData.discount_type === "none") {
      return 0;
    }
    
    // Calculate the base amount
    let baseAmount = 0;
    if (displayData.original_total_price) {
      baseAmount = displayData.original_total_price;
    } else if (subTotal !== undefined) {
      baseAmount = subTotal;
    } else if (displayData.items && Array.isArray(displayData.items)) {
      // Ensure we're only summing numbers
      baseAmount = displayData.items.reduce((sum, item) => {
        const itemPrice = typeof item.price === 'number' ? item.price : 0;
        return sum + itemPrice;
      }, 0);
    }
    
    if (displayData.discount_type === "percentage") {
      return (baseAmount * displayData.discount_value) / 100;
    }
    
    return Math.min(displayData.discount_value, baseAmount);
  };

  const manualDiscount = calculateDiscount();
  const totalDiscount = manualDiscount + displayData.membershipDiscount;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Receipt</h2>
        {receiptNumber && (
          <div className="flex items-center space-x-2">
            <Receipt className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500">#{receiptNumber}</span>
          </div>
        )}
      </div>

      <div className="space-y-8">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <User className="h-4 w-4 text-gray-500" />
                <span>{displayData.customer?.full_name}</span>
              </div>
              {displayData.customer?.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{displayData.customer.email}</span>
                </div>
              )}
              {displayData.customer?.phone_number && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{formatPhoneNumber(displayData.customer.phone_number)}</span>
                </div>
              )}
              <div className="flex items-center space-x-3">
                <CalendarIcon className="h-4 w-4 text-gray-500" />
                <span>{formatDate(displayData.start_time)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Services</h3>
            <div className="space-y-4">
              {displayData.items && displayData.items.map((item) => (
                <div key={item.id} className="border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{item.name}</h4>
                      {item.employee && (
                        <p className="text-sm text-muted-foreground">
                          Stylist: {item.employee.name}
                        </p>
                      )}
                      {item.duration && (
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          <span>{item.duration} min</span>
                        </div>
                      )}
                    </div>
                    <div className="font-medium">{formatPrice(item.price)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Payment Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>
                  {formatPrice(
                    displayData.original_total_price || 
                    (subTotal !== undefined ? subTotal : 
                    (displayData.items && Array.isArray(displayData.items)) ? 
                      displayData.items.reduce((sum, item) => {
                        const itemPrice = typeof item.price === 'number' ? item.price : 0;
                        return sum + itemPrice;
                      }, 0) : 0
                    )
                  )}
                </span>
              </div>
              
              {/* Manual discount */}
              {manualDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Discount ({displayData.discount_type === "percentage" 
                      ? `${displayData.discount_value}%` 
                      : formatPrice(displayData.discount_value)})
                  </span>
                  <span className="text-green-600">-{formatPrice(manualDiscount)}</span>
                </div>
              )}
              
              {/* Membership discount */}
              {displayData.membershipDiscount > 0 && displayData.membershipName && (
                <div className="flex justify-between text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <span>Membership Discount</span>
                    <Badge variant="outline" className="ml-2">
                      <Tag className="h-3 w-3 mr-1" />
                      {displayData.membershipName}
                    </Badge>
                  </div>
                  <span className="text-green-600">-{formatPrice(displayData.membershipDiscount)}</span>
                </div>
              )}
              
              {displayData.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatPrice(displayData.taxAmount)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-medium pt-2 border-t mt-2">
                <span>Total</span>
                <span>{formatPrice(displayData.totalPrice)}</span>
              </div>
              
              <div className="flex items-center space-x-2 pt-4">
                {getPaymentIcon()}
                <span className="text-sm">
                  Paid via {displayData.paymentMethod}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {onAddAnother && (
        <div className="mt-8 flex justify-center">
          <Button onClick={onAddAnother}>Create New Sale</Button>
        </div>
      )}
    </div>
  );
}
