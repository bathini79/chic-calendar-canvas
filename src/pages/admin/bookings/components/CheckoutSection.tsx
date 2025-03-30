
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import { ServicesList } from "./ServicesList";
import { PaymentMethodSelect } from "./PaymentMethodSelect";
import { DiscountSelect } from "./DiscountSelect";
import { formatPrice } from "@/lib/utils";
import { PaymentMethod, AppointmentStatus, DiscountType } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { useCreateTransaction } from "../hooks/useCreateTransaction";

interface CheckoutSectionProps {
  appointmentId: string;
  selectedCustomer: any;
  selectedServices: string[];
  selectedPackages: string[];
  services: any[];
  packages: any[];
  discountType: DiscountType;
  discountValue: number;
  paymentMethod: PaymentMethod;
  notes: string;
  onDiscountTypeChange: (type: DiscountType) => void;
  onDiscountValueChange: (value: number) => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onNotesChange: (notes: string) => void;
  onPaymentComplete?: (appointmentId?: string) => void;
  selectedStylists: Record<string, string>;
  selectedTimeSlots: Record<string, string>;
  onBackToServices: () => void;
  onSaveAppointment: () => Promise<string | null>;
  onRemoveService: (serviceId: string) => void;
  onRemovePackage: (packageId: string) => void;
  customizedServices: Record<string, string[]>;
  isExistingAppointment?: boolean;
  locationId?: string;
  appointmentStatus?: AppointmentStatus;
  onCancelAppointment?: () => void;
  onMarkAsNoShow?: () => void;
  onMarkAsCompleted?: () => void;
  extraActionSlot?: React.ReactNode;
}

export const CheckoutSection: React.FC<CheckoutSectionProps> = ({
  appointmentId,
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
  onBackToServices,
  onSaveAppointment,
  onRemoveService,
  onRemovePackage,
  customizedServices,
  isExistingAppointment,
  locationId,
  appointmentStatus,
  onCancelAppointment,
  onMarkAsNoShow,
  onMarkAsCompleted,
  extraActionSlot
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showNoShowConfirm, setShowNoShowConfirm] = useState(false);
  const { recordTransaction } = useCreateTransaction();

  // Filter services to only those selected
  const filteredServices = services?.filter((service: any) =>
    selectedServices.includes(service.id)
  );

  // Filter packages to only those selected
  const filteredPackages = packages?.filter((pkg: any) =>
    selectedPackages.includes(pkg.id)
  );

  // Calculate subtotal
  const calculateSubTotal = () => {
    let total = 0;

    // Add service prices
    filteredServices?.forEach((service: any) => {
      total += service.selling_price;
    });

    // Add package prices
    filteredPackages?.forEach((pkg: any) => {
      total += pkg.price;

      // Add customized services for this package
      const packageCustomServices = customizedServices[pkg.id] || [];
      packageCustomServices.forEach((serviceId) => {
        const service = services.find((s) => s.id === serviceId);
        if (service) {
          total += service.selling_price;
        }
      });
    });

    return total;
  };

  const subtotal = calculateSubTotal();

  // Calculate discount
  const calculateDiscount = () => {
    if (discountType === "percentage") {
      return (subtotal * discountValue) / 100;
    } else if (discountType === "fixed") {
      return discountValue;
    }
    return 0;
  };

  const discount = calculateDiscount();

  // Calculate total
  const total = subtotal - discount;

  const handleCheckout = async () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    if (selectedServices.length === 0 && selectedPackages.length === 0) {
      toast.error("Please select at least one service or package");
      return;
    }

    try {
      setIsProcessing(true);
      
      // Save the appointment first
      const savedAppointmentId = await onSaveAppointment();
      
      if (!savedAppointmentId) {
        throw new Error("Failed to save appointment");
      }
      
      // Record the transaction
      await recordTransaction({
        customerId: selectedCustomer.id,
        amount: total,
        paymentMethod: paymentMethod,
        appointmentId: savedAppointmentId,
        locationId: locationId,
      });

      // Update appointment status to completed
      const { error: updateError } = await supabase
        .from("appointments")
        .update({
          status: "completed",
          payment_method: paymentMethod,
        })
        .eq("id", savedAppointmentId);

      if (updateError) {
        throw updateError;
      }

      toast.success("Payment completed successfully");
      
      if (onPaymentComplete) {
        onPaymentComplete(savedAppointmentId);
      }
    } catch (error: any) {
      console.error("Error processing payment:", error);
      toast.error(`Payment failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBackToServices}
              disabled={isProcessing}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold">Checkout</h2>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          <ServicesList
            services={filteredServices}
            packages={filteredPackages}
            customizedServices={customizedServices}
            allServices={services}
            selectedStylists={selectedStylists}
            employees={[]}
            onRemoveService={onRemoveService}
            onRemovePackage={onRemovePackage}
          />

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="font-medium">Discount</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            </div>

            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Discount</h3>
              <DiscountSelect
                discountType={discountType}
                discountValue={discountValue}
                onDiscountTypeChange={onDiscountTypeChange}
                onDiscountValueChange={onDiscountValueChange}
              />
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Payment Method</h3>
              <PaymentMethodSelect
                paymentMethod={paymentMethod}
                onPaymentMethodChange={onPaymentMethodChange}
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Notes</h3>
            <Textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Add any notes about this appointment..."
              className="h-20"
            />
          </div>
        </div>
      </div>

      <div className="p-6 border-t">
        <div className="flex justify-between items-center">
          {isExistingAppointment ? (
            <div className="flex gap-2">
              {extraActionSlot}
              
              {onCancelAppointment && (
                <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                      Cancel Appointment
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to cancel this appointment? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>No, keep it</AlertDialogCancel>
                      <AlertDialogAction onClick={onCancelAppointment}>
                        Yes, cancel appointment
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              
              {onMarkAsNoShow && (
                <AlertDialog open={showNoShowConfirm} onOpenChange={setShowNoShowConfirm}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">Mark as No-Show</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Mark as No-Show</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to mark this appointment as a no-show? 
                        This will affect the customer's attendance record.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onMarkAsNoShow}>
                        Mark as No-Show
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ) : (
            <div></div> // Empty div for spacing when not an existing appointment
          )}

          <div className="flex gap-2">
            {isExistingAppointment && onMarkAsCompleted && (
              <Button variant="outline" onClick={onMarkAsCompleted}>
                Mark as Completed
              </Button>
            )}
            <Button
              onClick={handleCheckout}
              className="bg-black text-white hover:bg-gray-800"
              disabled={isProcessing || !selectedCustomer}
            >
              {isProcessing ? "Processing..." : "Complete Sale"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
