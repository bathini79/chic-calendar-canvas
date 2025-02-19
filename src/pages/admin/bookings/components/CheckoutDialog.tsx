
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethod: 'cash' | 'online';
  onPaymentMethodChange: (value: 'cash' | 'online') => void;
  discountType: 'none' | 'percentage' | 'fixed';
  onDiscountTypeChange: (value: 'none' | 'percentage' | 'fixed') => void;
  discountValue: number;
  onDiscountValueChange: (value: number) => void;
  totalPrice: number;
  notes: string;
  onNotesChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  step: 'checkout' | 'payment' | 'completed';
}

export function CheckoutDialog({
  open,
  onOpenChange,
  paymentMethod,
  onPaymentMethodChange,
  discountType,
  onDiscountTypeChange,
  discountValue,
  onDiscountValueChange,
  totalPrice,
  notes,
  onNotesChange,
  onSave,
  onCancel,
  step
}: CheckoutDialogProps) {
  const finalPrice = discountType === 'percentage'
    ? totalPrice * (1 - (discountValue / 100))
    : Math.max(0, totalPrice - discountValue);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {step === 'checkout' ? 'Checkout' : 
             step === 'payment' ? 'Payment' : 'Completed'}
          </DialogTitle>
        </DialogHeader>

        {step === 'checkout' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Discount Type</label>
              <Select value={discountType} onValueChange={onDiscountTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select discount type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {discountType !== 'none' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {discountType === 'percentage' ? 'Discount (%)' : 'Discount Amount (₹)'}
                </label>
                <Input
                  type="number"
                  value={discountValue}
                  onChange={(e) => onDiscountValueChange(Number(e.target.value))}
                  min={0}
                  max={discountType === 'percentage' ? 100 : undefined}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Add notes for this appointment"
              />
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-medium">Original Price:</span>
                <span>₹{totalPrice}</span>
              </div>
              {discountType !== 'none' && discountValue > 0 && (
                <div className="flex justify-between items-center text-green-600">
                  <span className="font-medium">Discount:</span>
                  <span>
                    {discountType === 'percentage' 
                      ? `${discountValue}%`
                      : `₹${discountValue}`
                    }
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center font-bold text-lg mt-2">
                <span>Final Price:</span>
                <span>₹{finalPrice}</span>
              </div>
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <p className="text-lg font-medium">Total Amount to Pay</p>
              <p className="text-2xl font-bold">₹{finalPrice}</p>
            </div>
            {paymentMethod === 'cash' ? (
              <div className="text-center text-gray-600">
                Please collect cash payment from the customer
              </div>
            ) : (
              <div className="text-center text-gray-600">
                Redirecting to online payment...
              </div>
            )}
          </div>
        )}

        {step === 'completed' && (
          <div className="space-y-4 py-4 text-center">
            <div className="text-green-600 text-xl font-medium">
              Payment Completed Successfully!
            </div>
            <div className="text-gray-600">
              Appointment has been confirmed and payment has been recorded.
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onCancel}>
            {step === 'completed' ? 'Close' : 'Cancel'}
          </Button>
          {step === 'checkout' && (
            <Button onClick={onSave}>
              Continue to Payment
            </Button>
          )}
          {step === 'payment' && (
            <Button onClick={onSave}>
              Complete Payment
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
