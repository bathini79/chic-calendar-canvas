
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaymentSectionProps {
  paymentMethod: 'cash' | 'online';
  onPaymentMethodChange: (value: 'cash' | 'online') => void;
  discountType: 'none' | 'percentage' | 'fixed';
  onDiscountTypeChange: (value: 'none' | 'percentage' | 'fixed') => void;
  discountValue: number;
  onDiscountValueChange: (value: number) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  totalPrice: number;
  onBack: () => void;
  onSave: () => void;
}

export function PaymentSection({
  paymentMethod,
  onPaymentMethodChange,
  discountType,
  onDiscountTypeChange,
  discountValue,
  onDiscountValueChange,
  notes,
  onNotesChange,
  totalPrice,
  onBack,
  onSave,
}: PaymentSectionProps) {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-2xl font-semibold">Payment Details</h2>
            <p className="text-gray-600">Complete payment for the appointment</p>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4">
              <div>
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

              <div>
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
                <div>
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

              <div>
                <label className="text-sm font-medium">Notes</label>
                <Input
                  type="text"
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder="Add notes for this appointment"
                />
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Price:</span>
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
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button onClick={onSave}>
              Make Payment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
