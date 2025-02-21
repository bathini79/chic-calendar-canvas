
import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PaymentDetails } from "./PaymentDetails";
import { CheckoutSection } from "./CheckoutSection";
import type { Service, Package } from "../types";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: Service[];
  packages: Package[];
  selectedServices: string[];
  selectedPackages: string[];
  appointmentId?: string;
  step: "checkout" | "payment" | "completed";
  paymentMethod: 'cash' | 'online';
  discountType: 'none' | 'percentage' | 'fixed';
  discountValue: number;
  notes: string;
  onPaymentMethodChange: (value: 'cash' | 'online') => void;
  onDiscountTypeChange: (value: 'none' | 'percentage' | 'fixed') => void;
  onDiscountValueChange: (value: number) => void;
  onNotesChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const CheckoutDialog: React.FC<CheckoutDialogProps> = ({
  open,
  onOpenChange,
  services,
  packages,
  selectedServices,
  selectedPackages,
  appointmentId,
  step,
  paymentMethod,
  discountType,
  discountValue,
  notes,
  onPaymentMethodChange,
  onDiscountTypeChange,
  onDiscountValueChange,
  onNotesChange,
  onSave,
  onCancel,
}) => {
  if (!appointmentId) {
    console.error("No appointment ID provided to CheckoutDialog");
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        {step === "checkout" && (
          <CheckoutSection
            appointmentId={appointmentId}
            selectedServices={selectedServices}
            selectedPackages={selectedPackages}
            services={services}
            packages={packages}
            discountType={discountType}
            discountValue={discountValue}
            paymentMethod={paymentMethod}
            notes={notes}
            onDiscountTypeChange={onDiscountTypeChange}
            onDiscountValueChange={onDiscountValueChange}
            onPaymentMethodChange={onPaymentMethodChange}
            onNotesChange={onNotesChange}
            onPaymentComplete={onSave}
          />
        )}
        
        {step === "payment" && (
          <PaymentDetails
            paymentCompleted={false}
            selectedServices={selectedServices}
            services={services}
            employees={[]}
            selectedStylists={{}}
            selectedCustomer={null}
            paymentMethod={paymentMethod}
            discountType={discountType}
            discountValue={discountValue}
            appointmentNotes={notes}
            onPaymentMethodChange={onPaymentMethodChange}
            onDiscountTypeChange={onDiscountTypeChange}
            onDiscountValueChange={onDiscountValueChange}
            onNotesChange={onNotesChange}
            onSave={onSave}
            getTotalPrice={() => 0}
            getFinalPrice={() => 0}
          />
        )}

        {step === "completed" && (
          <div className="p-6 text-center">
            <h2 className="text-2xl font-semibold text-green-600 mb-4">
              Payment Completed Successfully
            </h2>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
