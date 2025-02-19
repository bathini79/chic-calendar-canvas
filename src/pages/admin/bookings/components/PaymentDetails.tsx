
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaymentDetailsProps {
  paymentCompleted: boolean;
  selectedServices: string[];
  services: any[];
  employees: any[];
  selectedStylists: Record<string, string>;
  selectedCustomer: any;
  paymentMethod: 'cash' | 'online';
  discountType: 'none' | 'percentage' | 'fixed';
  discountValue: number;
  appointmentNotes: string;
  getTotalPrice: () => number;
  getFinalPrice: () => number;
  onPaymentMethodChange: (value: 'cash' | 'online') => void;
  onDiscountTypeChange: (value: 'none' | 'percentage' | 'fixed') => void;
  onDiscountValueChange: (value: number) => void;
  onNotesChange: (value: string) => void;
  onSave: () => void;
}

export function PaymentDetails({
  paymentCompleted,
  selectedServices,
  services,
  employees,
  selectedStylists,
  selectedCustomer,
  paymentMethod,
  discountType,
  discountValue,
  appointmentNotes,
  getTotalPrice,
  getFinalPrice,
  onPaymentMethodChange,
  onDiscountTypeChange,
  onDiscountValueChange,
  onNotesChange,
  onSave,
}: PaymentDetailsProps) {
  const totalPrice = getTotalPrice();
  const finalPrice = getFinalPrice();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Payment Details</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Payment Method</label>
            <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
              <SelectTrigger>
                <SelectValue />
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
                <SelectValue />
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
              value={appointmentNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Add notes for this payment"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Original Price:</span>
          <span>₹{totalPrice}</span>
        </div>
        {discountType !== 'none' && discountValue > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount:</span>
            <span>
              {discountType === 'percentage' 
                ? `${discountValue}%`
                : `₹${discountValue}`
              }
            </span>
          </div>
        )}
        <div className="flex justify-between font-bold">
          <span>Final Price:</span>
          <span>₹{finalPrice}</span>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button onClick={onSave}>
          {paymentCompleted ? 'Close' : 'Complete Payment'}
        </Button>
      </div>
    </div>
  );
}
