
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Clock,
  IndianRupee,
  Phone,
  Mail,
  User,
  Calendar,
  MapPin,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { SummaryViewProps } from "../types";
import { useWhatsAppNotification } from "../hooks/useWhatsAppNotification";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";

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
  membershipDiscount,
  children,
}) => {
  const [locationName, setLocationName] = useState<string | null>(null);
  const [taxName, setTaxName] = useState<string | null>(null);
  const [taxRate, setTaxRate] = useState<number | null>(null);
  const { sendWhatsAppNotification, isSending } = useWhatsAppNotification();
  const [showDetails, setShowDetails] = useState(false);

  const { data: appointmentDetails } = useQuery({
    queryKey: ["appointment-details", appointmentId],
    queryFn: async () => {
      if (!appointmentId) return null;
      
      const { data, error } = await supabase
        .from("appointments")
        .select("*, customer:profiles(*), bookings(*)")
        .eq("id", appointmentId)
        .single();
        
      if (error) {
        console.error("Error fetching appointment details:", error);
        return null;
      }
      
      return data;
    },
    enabled: !!appointmentId,
  });

  useEffect(() => {
    const fetchTaxDetails = async () => {
      if (!appointmentDetails?.tax_id) return;
      
      const { data } = await supabase
        .from("tax_rates")
        .select("name, percentage")
        .eq("id", appointmentDetails.tax_id)
        .single();
        
      if (data) {
        setTaxName(data.name);
        setTaxRate(data.percentage);
      }
    };

    const fetchLocationName = async () => {
      if (!appointmentDetails?.location_id) return;
      
      const { data } = await supabase
        .from("locations")
        .select("name")
        .eq("id", appointmentDetails.location_id)
        .single();
        
      if (data) {
        setLocationName(data.name);
      }
    };
    
    if (appointmentDetails) {
      fetchTaxDetails();
      fetchLocationName();
    }
  }, [appointmentDetails]);

  const handleSendWhatsAppConfirmation = async () => {
    if (!appointmentId || !customer) {
      toast.error("Missing required information to send confirmation");
      return;
    }

    try {
      await sendWhatsAppNotification({
        appointmentId,
        notificationType: "booking_confirmation",
        customerName: customer.full_name,
        customerPhone: customer.phone_number || "",
      });

      toast.success("Confirmation sent successfully!");
    } catch (error) {
      console.error("Error sending confirmation:", error);
      toast.error("Failed to send confirmation");
    }
  };

  const hasLoyaltyPoints = appointmentDetails && 
    (appointmentDetails.points_earned > 0 || appointmentDetails.points_redeemed > 0);

  return (
    <div className="p-4 flex flex-col h-full">
      <Card className="shadow-md flex-1 overflow-hidden">
        <CardHeader className="pb-2 pt-6 px-6">
          <div className="flex justify-between mb-2">
            <CardTitle className="text-xl">Booking Confirmed</CardTitle>
            {locationName && (
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="mr-1 h-4 w-4" />
                {locationName}
              </div>
            )}
          </div>
          {customer && (
            <div className="flex flex-col text-muted-foreground">
              <span className="flex items-center text-sm mb-1">
                <User className="mr-2 h-4 w-4" />
                {customer.full_name}
              </span>
              {customer.phone_number && (
                <span className="flex items-center text-sm mb-1">
                  <Phone className="mr-2 h-4 w-4" />
                  {customer.phone_number}
                </span>
              )}
              {customer.email && (
                <span className="flex items-center text-sm">
                  <Mail className="mr-2 h-4 w-4" />
                  {customer.email}
                </span>
              )}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="px-6 pb-6 overflow-y-auto">
          <div className="space-y-4">
            {receiptNumber && (
              <div className="pb-2 border-b">
                <div className="flex justify-between">
                  <Label className="text-muted-foreground">Receipt</Label>
                  <span className="font-semibold">{receiptNumber}</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className="flex justify-between items-start py-2 border-b last:border-b-0 border-gray-100"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{item.name}</p>
                    <div className="flex text-sm text-muted-foreground gap-x-4">
                      {item.duration && (
                        <span className="flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          {item.duration} min
                        </span>
                      )}
                      {item.employee?.name && (
                        <span className="flex items-center">
                          <User className="mr-1 h-3 w-3" />
                          {item.employee.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-medium">
                    <IndianRupee className="inline h-3 w-3" />
                    {item.price}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>
                  <IndianRupee className="inline h-3 w-3" />
                  {subTotal || totalPrice || 0}
                </span>
              </div>

              {membershipName && membershipDiscount && membershipDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Membership Discount ({membershipName})</span>
                  <span>
                    -<IndianRupee className="inline h-3 w-3" />
                    {membershipDiscount}
                  </span>
                </div>
              )}

              {appointmentDetails?.discount_value > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>
                    Discount
                    {appointmentDetails?.discount_type === "percentage" && 
                     ` (${appointmentDetails?.discount_value}%)`}
                  </span>
                  <span>
                    -<IndianRupee className="inline h-3 w-3" />
                    {appointmentDetails?.discount_type === "percentage" 
                      ? ((subTotal || 0) * (appointmentDetails?.discount_value / 100)).toFixed(2)
                      : appointmentDetails?.discount_value}
                  </span>
                </div>
              )}

              {hasLoyaltyPoints && appointmentDetails?.points_redeemed > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="flex items-center">
                    <Star className="mr-1 h-3 w-3" />
                    Points Redeemed ({appointmentDetails.points_redeemed} points)
                  </span>
                  <span>
                    -<IndianRupee className="inline h-3 w-3" />
                    {appointmentDetails.points_discount_amount?.toFixed(2) || "0.00"}
                  </span>
                </div>
              )}

              {taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {taxName || "Tax"}{taxRate ? ` (${taxRate}%)` : ""}
                  </span>
                  <span>
                    <IndianRupee className="inline h-3 w-3" />
                    {taxAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                <span>Total</span>
                <span>
                  <IndianRupee className="inline h-4 w-4" />
                  {totalPrice?.toFixed(2) || "0.00"}
                </span>
              </div>

              <div className="flex justify-between text-sm text-muted-foreground pt-1">
                <span>Payment Method</span>
                <span className="capitalize">{paymentMethod}</span>
              </div>
              
              {hasLoyaltyPoints && appointmentDetails?.points_earned > 0 && (
                <div className="flex justify-between text-sm text-amber-600 pt-1">
                  <span className="flex items-center">
                    <Star className="mr-1 h-3 w-3" />
                    Points Earned
                  </span>
                  <span>+{appointmentDetails.points_earned} points</span>
                </div>
              )}
            </div>

            {appointmentDetails?.created_at && (
              <div className="flex items-center justify-center text-xs text-muted-foreground border-t pt-4 mt-4">
                <Calendar className="mr-1 h-3 w-3" />
                {format(new Date(appointmentDetails.created_at), "PPpp")}
              </div>
            )}
          </div>

          {children}
        </CardContent>
      </Card>

      <div className="flex gap-2 mt-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleSendWhatsAppConfirmation}
          disabled={isSending || !customer?.phone_number}
        >
          {isSending ? "Sending..." : "Send WhatsApp Confirmation"}
        </Button>
        <Button className="flex-1" onClick={onAddAnother}>
          Add Another Appointment
        </Button>
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogTrigger asChild>
          <Button
            variant="link"
            className="mt-2 text-muted-foreground"
            onClick={() => setShowDetails(true)}
          >
            View Detailed Receipt
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detailed Receipt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <Label className="text-muted-foreground">Receipt Number</Label>
              <span className="font-semibold">{receiptNumber}</span>

              <Label className="text-muted-foreground">Customer</Label>
              <span>{customer?.full_name}</span>

              <Label className="text-muted-foreground">Date</Label>
              <span>
                {appointmentDetails?.created_at &&
                  format(new Date(appointmentDetails.created_at), "PPpp")}
              </span>

              <Label className="text-muted-foreground">Payment Method</Label>
              <span className="capitalize">{paymentMethod}</span>

              <Label className="text-muted-foreground">Location</Label>
              <span>{locationName || "N/A"}</span>
              
              {hasLoyaltyPoints && (
                <>
                  <Label className="text-muted-foreground">Points Earned</Label>
                  <span>{appointmentDetails?.points_earned || 0}</span>
                  
                  <Label className="text-muted-foreground">Points Redeemed</Label>
                  <span>{appointmentDetails?.points_redeemed || 0}</span>
                </>
              )}
            </div>

            <div className="border-t pt-4">
              <Label className="text-muted-foreground mb-2 block">
                Items
              </Label>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    className="flex justify-between"
                  >
                    <span>{item.name}</span>
                    <span>
                      <IndianRupee className="inline h-3 w-3" />
                      {item.price}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between">
                <Label className="text-muted-foreground">Subtotal</Label>
                <span>
                  <IndianRupee className="inline h-3 w-3" />
                  {subTotal || totalPrice || 0}
                </span>
              </div>

              {membershipName && membershipDiscount && membershipDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Membership Discount</span>
                  <span>
                    -<IndianRupee className="inline h-3 w-3" />
                    {membershipDiscount}
                  </span>
                </div>
              )}

              {appointmentDetails?.discount_value > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>
                    -<IndianRupee className="inline h-3 w-3" />
                    {appointmentDetails?.discount_type === "percentage" 
                      ? ((subTotal || 0) * (appointmentDetails?.discount_value / 100)).toFixed(2)
                      : appointmentDetails?.discount_value}
                  </span>
                </div>
              )}

              {hasLoyaltyPoints && appointmentDetails?.points_redeemed > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Points Discount</span>
                  <span>
                    -<IndianRupee className="inline h-3 w-3" />
                    {appointmentDetails?.points_discount_amount?.toFixed(2) || "0.00"}
                  </span>
                </div>
              )}

              {taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>{taxName || "Tax"}</span>
                  <span>
                    <IndianRupee className="inline h-3 w-3" />
                    {taxAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between font-semibold pt-2 border-t mt-2">
                <span>Total</span>
                <span>
                  <IndianRupee className="inline h-3 w-3" />
                  {totalPrice?.toFixed(2) || "0.00"}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
