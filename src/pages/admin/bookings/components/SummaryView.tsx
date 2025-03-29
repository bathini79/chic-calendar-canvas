
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Check,
  CircleUserRound,
  FileText,
  CreditCard,
  IndianRupee,
  Package,
  MapPin,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { SummaryViewProps } from "../types";
import { getPriceWithDiscount } from "../utils/bookingUtils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const SummaryView: React.FC<SummaryViewProps> = ({
  appointmentId,
  customer,
  totalPrice,
  items = [],
  paymentMethod,
  onAddAnother,
  receiptNumber,
  taxAmount = 0,
  subTotal,
  membershipName,
  membershipDiscount = 0,
  children,
}) => {
  const [locationName, setLocationName] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<any>(null);

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    const fetchAppointment = async () => {
      if (!appointmentId) return;

      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('*, customer:profiles(*)')
          .eq('id', appointmentId)
          .single();

        if (error) throw error;
        
        setAppointment(data);
        
        if (data?.location) {
          setLocationId(data.location);
        }
      } catch (err) {
        console.error('Error fetching appointment:', err);
      }
    };

    fetchAppointment();
  }, [appointmentId]);

  useEffect(() => {
    if (locationId && locations && locations.length > 0) {
      const location = locations.find(loc => loc.id === locationId);
      if (location) {
        setLocationName(location.name);
      }
    }
  }, [locationId, locations]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="min-h-96 p-4 bg-white rounded-lg space-y-6">
      <div className="text-center space-y-2 mb-6">
        <Check className="mx-auto h-12 w-12 bg-green-100 text-green-600 p-2 rounded-full" />
        <h2 className="text-2xl font-semibold text-green-600">Payment Successful</h2>
        <p className="text-muted-foreground">Your appointment has been confirmed</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Appointment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <CircleUserRound className="h-5 w-5 text-muted-foreground" />
              <span>{customer?.full_name || appointment?.customer?.full_name || 'Guest'}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {appointment?.start_time && (
                <div>
                  {format(parseISO(appointment.start_time), "MMM dd, yyyy")}
                  <span className="mx-1">•</span>
                  {format(parseISO(appointment.start_time), "hh:mm a")}
                </div>
              )}
            </div>
          </div>

          {locationName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{locationName}</span>
            </div>
          )}

          <div className="pt-2">
            <h3 className="text-sm font-medium mb-2">Services</h3>
            {items && items.length > 0 ? (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      {item.employee && (
                        <p className="text-xs text-muted-foreground">
                          Stylist: {item.employee.name}
                        </p>
                      )}
                      {item.duration && (
                        <p className="text-xs text-muted-foreground">
                          {Math.floor(item.duration / 60)}h {item.duration % 60}m
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-medium">
                      <IndianRupee className="inline h-3 w-3" />
                      {item.price.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No items</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Payment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>
                <IndianRupee className="inline h-3 w-3" />
                {subTotal ? subTotal.toFixed(2) : totalPrice ? totalPrice.toFixed(2) : "0.00"}
              </span>
            </div>
            
            {membershipName && membershipDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{membershipName} Discount</span>
                <span className="text-green-600">
                  -<IndianRupee className="inline h-3 w-3" />
                  {membershipDiscount.toFixed(2)}
                </span>
              </div>
            )}
            
            {appointment?.discount_type && appointment.discount_type !== "none" && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {appointment.discount_type === "percentage" 
                    ? `Discount (${appointment.discount_value}%)` 
                    : "Discount"}
                </span>
                <span className="text-green-600">
                  -<IndianRupee className="inline h-3 w-3" />
                  {appointment.discount_type === "percentage"
                    ? ((subTotal || totalPrice || 0) * (appointment.discount_value / 100)).toFixed(2)
                    : appointment.discount_value.toFixed(2)}
                </span>
              </div>
            )}
            
            {appointment?.coupon_id && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {appointment.coupon_name ? `Coupon (${appointment.coupon_name})` : 'Coupon'}
                </span>
                <span className="text-green-600">
                  -<IndianRupee className="inline h-3 w-3" />
                  {appointment.coupon_amount?.toFixed(2) || '0.00'}
                </span>
              </div>
            )}
            
            {taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>
                  <IndianRupee className="inline h-3 w-3" />
                  {taxAmount.toFixed(2)}
                </span>
              </div>
            )}
          </div>
          
          <Separator />
          
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span>
              <IndianRupee className="inline h-4 w-4" />
              {totalPrice ? totalPrice.toFixed(2) : "0.00"}
            </span>
          </div>

          <div className="pt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            <span>Paid via {paymentMethod}</span>
          </div>
          
          {receiptNumber && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Receipt: #{receiptNumber}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {children}

      {onAddAnother && (
        <div className="flex justify-center pt-4">
          <Button onClick={onAddAnother}>
            <Package className="mr-2 h-4 w-4" />
            Add Another Appointment
          </Button>
        </div>
      )}
    </div>
  );
};
