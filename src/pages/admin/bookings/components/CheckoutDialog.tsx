
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

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
  onSave: () => void;
  onCancel: () => void;
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
  onSave,
  onCancel
}: CheckoutDialogProps) {
  const finalPrice = discountType === 'percentage'
    ? totalPrice * (1 - (discountValue / 100))
    : Math.max(0, totalPrice - discountValue);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
        </DialogHeader>
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
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSave}>
            Complete Booking
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
