import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getTotalPrice, getPriceWithDiscount } from "../utils/bookingUtils";
import { formatPrice } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Appointment } from "../types";

interface CheckoutSectionProps {
  selectedCustomer: any;
  selectedServices: string[];
  selectedPackages: string[];
  services: any[];
  packages: any[];
  discountType: string;
  discountValue: number;
  paymentMethod: string;
  notes: string;
  onDiscountTypeChange: (type: string) => void;
  onDiscountValueChange: (value: number) => void;
  onPaymentMethodChange: (method: string) => void;
  onNotesChange: (notes: string) => void;
  onPaymentComplete: (appointmentId?: string) => void;
  selectedStylists: Record<string, string>;
  selectedTimeSlots: Record<string, string>;
  onSaveAppointment: () => Promise<string | null>;
  onRemoveService: (id: string) => void;
  onRemovePackage: (id: string) => void;
  onBackToServices: () => void;
  customizedServices: Record<string, string[]>;
  isExistingAppointment?: boolean;
  appointmentId: string;
  locationId?: string;
}

export const CheckoutSection: React.FC<CheckoutSectionProps> = ({
  selectedCustomer,
  selectedServices,
  selectedPackages,
  services,
  packages,
  discountType,
  discountValue,
  paymentMethod,
  notes,
  onDiscountTypeChange,
  onDiscountValueChange,
  onPaymentMethodChange,
  onNotesChange,
  onPaymentComplete,
  selectedStylists,
  selectedTimeSlots,
  onSaveAppointment,
  onRemoveService,
  onRemovePackage,
  onBackToServices,
  customizedServices,
  isExistingAppointment = false,
  appointmentId,
  locationId
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [taxAmount, setTaxAmount] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Fetch locations for proper display
    const fetchLocations = async () => {
      const { data } = await supabase
        .from("locations")
        .select("*");
      
      if (data) {
        setLocations(data);
      }
    };
    
    fetchLocations();
  }, []);

  const subTotal = getTotalPrice(
    selectedServices,
    selectedPackages,
    services,
    packages,
    customizedServices
  );

  // Calculate final price with discount
  const discountedPrice = getPriceWithDiscount(subTotal, discountType, discountValue);
  
  // Calculate final price with tax
  const totalPrice = discountedPrice + taxAmount;

  const getSelectedServices = () => {
    return selectedServices.map((id) => {
      const service = services.find((s) => s.id === id);
      const stylistId = selectedStylists[id];
      const stylist = service?.employees?.find((e) => e.id === stylistId);

      return {
        id,
        type: "service",
        name: service?.name || "Unknown Service",
        price: service?.selling_price || 0,
        duration: service?.duration || 0,
        employee: stylist
          ? {
              id: stylist.id,
              name: stylist.name,
            }
          : undefined,
      };
    });
  };

  const getSelectedPackages = () => {
    return selectedPackages.map((id) => {
      const pkg = packages.find((p) => p.id === id);
      const stylistId = selectedStylists[id];
      const stylist = pkg?.employees?.find((e) => e.id === stylistId);

      return {
        id,
        type: "package",
        name: pkg?.name || "Unknown Package",
        price: pkg?.price || 0,
        duration: pkg?.duration || 0,
        employee: stylist
          ? {
              id: stylist.id,
              name: stylist.name,
            }
          : undefined,
      };
    });
  };

  const renderCustomerSection = () => (
    <div className="space-y-2">
      <h4 className="font-medium">Customer</h4>
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm font-medium">{selectedCustomer?.full_name}</p>
        <p className="text-sm text-gray-500">{selectedCustomer?.email}</p>
        {selectedCustomer?.phone && (
          <p className="text-sm text-gray-500">{selectedCustomer?.phone}</p>
        )}
      </div>
    </div>
  );

  const renderServicesSection = () => (
    <div className="space-y-2">
      <h4 className="font-medium">Services</h4>
      <ul className="space-y-2">
        {getSelectedServices().map((service) => (
          <li
            key={service.id}
            className="flex items-center justify-between px-4 py-2 rounded-lg border"
          >
            <div>
              <p className="text-sm font-medium">{service.name}</p>
              {service.employee && (
                <p className="text-xs text-gray-500">
                  Stylist: {service.employee.name}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm">{formatPrice(service.price)}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveService(service.id)}
              >
                ✕
              </Button>
            </div>
          </li>
        ))}
        {getSelectedPackages().map((pkg) => (
          <li
            key={pkg.id}
            className="flex items-center justify-between px-4 py-2 rounded-lg border"
          >
            <div>
              <p className="text-sm font-medium">{pkg.name}</p>
              {pkg.employee && (
                <p className="text-xs text-gray-500">
                  Stylist: {pkg.employee.name}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm">{formatPrice(pkg.price)}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemovePackage(pkg.id)}
              >
                ✕
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  const renderPaymentMethodSection = () => (
    <div className="space-y-2">
      <h4 className="font-medium">Payment Method</h4>
      <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select payment method" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="cash">Cash</SelectItem>
          <SelectItem value="online">Online</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const renderDiscountSection = () => (
    <div className="space-y-2">
      <h4 className="font-medium">Discount</h4>
      <div className="flex space-x-4">
        <Select value={discountType} onValueChange={onDiscountTypeChange}>
          <SelectTrigger className="w-auto">
            <SelectValue placeholder="Select discount type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Discount</SelectItem>
            <SelectItem value="percentage">Percentage</SelectItem>
            <SelectItem value="fixed">Fixed</SelectItem>
          </SelectContent>
        </Select>
        {discountType !== "none" && (
          <Input
            type="number"
            placeholder="Enter discount value"
            value={discountValue.toString()}
            onChange={(e) => onDiscountValueChange(Number(e.target.value))}
          />
        )}
      </div>
    </div>
  );

  const renderNotesSection = () => (
    <div className="space-y-2">
      <h4 className="font-medium">Notes</h4>
      <Textarea
        placeholder="Appointment notes"
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
      />
    </div>
  );

  const renderOrderItem = (item: any) => (
    <div key={item.id} className="flex items-center justify-between py-2 border-b">
      <div>
        <p className="text-sm font-medium">{item.name}</p>
        {item.employee && (
          <p className="text-xs text-gray-500">Stylist: {item.employee.name}</p>
        )}
      </div>
      <span className="text-sm">{formatPrice(item.price)}</span>
    </div>
  );

  const handleCompletePayment = async () => {
    setIsProcessing(true);
    try {
      if (!selectedCustomer) {
        toast.error("Please select a customer");
        return;
      }

      // If it's an existing appointment, update it instead of creating a new one
      if (isExistingAppointment && appointmentId) {
        const { error } = await supabase
          .from("appointments")
          .update({
            status: "completed",
            payment_method: paymentMethod,
            discount_type: discountType,
            discount_value: discountValue,
            total_price: totalPrice,
            notes: notes,
            tax_amount: taxAmount
          })
          .eq("id", appointmentId);

        if (error) {
          toast.error(`Failed to update appointment: ${error.message}`);
          return;
        }

        // Update all bookings to completed
        const { error: bookingsError } = await supabase
          .from("bookings")
          .update({ status: "completed" })
          .eq("appointment_id", appointmentId);

        if (bookingsError) {
          toast.error(`Failed to update bookings: ${bookingsError.message}`);
          return;
        }

        // Invalidate queries to refresh the TimeSlots component
        const selectedDate = new Date(); // Default to today if not available
        queryClient.invalidateQueries({ 
          queryKey: ['appointments', format(selectedDate, 'yyyy-MM-dd'), locationId] 
        });
        
        toast.success("Payment completed!");
        onPaymentComplete(appointmentId);
        return;
      }

      // Create a new appointment with payment
      const newAppointmentId = await onSaveAppointment();
      if (!newAppointmentId) {
        toast.error("Failed to create appointment");
        return;
      }

      // Update the appointment status to completed
      const { error } = await supabase
        .from("appointments")
        .update({ 
          status: "completed",
          tax_amount: taxAmount
        })
        .eq("id", newAppointmentId);

      if (error) {
        toast.error(`Failed to update appointment status: ${error.message}`);
        return;
      }

      // Update all bookings to completed
      const { error: bookingsError } = await supabase
        .from("bookings")
        .update({ status: "completed" })
        .eq("appointment_id", newAppointmentId);

      if (bookingsError) {
        toast.error(`Failed to update booking status: ${bookingsError.message}`);
        return;
      }
      
      // Invalidate queries to refresh the TimeSlots component
      queryClient.invalidateQueries({ 
        queryKey: ['appointments', format(new Date(), 'yyyy-MM-dd'), locationId] 
      });

      toast.success("Payment completed!");
      onPaymentComplete(newAppointmentId);
    } catch (error: any) {
      console.error("Error completing payment:", error);
      toast.error(error.message || "Failed to complete payment");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 flex-shrink-0">
        <h3 className="text-lg font-semibold">Checkout</h3>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-3/5 px-6 overflow-y-auto">
          <div className="space-y-6">
            {renderCustomerSection()}
            {renderServicesSection()}
            {renderPaymentMethodSection()}
            {renderDiscountSection()}
            {renderNotesSection()}
          </div>
        </div>

        <div className="w-2/5 bg-gray-50 p-6 overflow-y-auto">
          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <h4 className="font-medium text-lg mb-4">Order Summary</h4>
            <div className="space-y-4">
              {getSelectedServices().map((service) => renderOrderItem(service))}
              {getSelectedPackages().map((pkg) => renderOrderItem(pkg))}
            </div>
            <div className="border-t mt-4 pt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subTotal)}</span>
              </div>
              
              {discountType !== "none" && (
                <div className="flex justify-between text-sm mb-2 text-green-600">
                  <span>
                    Discount (
                    {discountType === "percentage"
                      ? `${discountValue}%`
                      : formatPrice(discountValue)}
                    )
                  </span>
                  <span>
                    -{formatPrice(subTotal - discountedPrice)}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatPrice(taxAmount)}</span>
              </div>
              
              <div className="flex justify-between font-semibold text-base pt-2">
                <span>Total</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <Button
                className="w-full bg-black text-white"
                onClick={handleCompletePayment}
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Complete Payment"}
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={onBackToServices}
                disabled={isProcessing}
              >
                Back to Services
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
