
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Banknote } from "lucide-react";
import type { Service, Package } from "../types";

interface CheckoutSectionProps {
  selectedServices: string[];
  selectedPackages: string[];
  services: Service[];
  packages: Package[];
  discountType: 'none' | 'percentage' | 'fixed';
  discountValue: number;
  paymentMethod: 'cash' | 'online';
  notes: string;
  onDiscountTypeChange: (value: 'none' | 'percentage' | 'fixed') => void;
  onDiscountValueChange: (value: number) => void;
  onPaymentMethodChange: (value: 'cash' | 'online') => void;
  onNotesChange: (value: string) => void;
  onPayNow: () => void;
}

export const CheckoutSection: React.FC<CheckoutSectionProps> = ({
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
  onPayNow,
}) => {
  const selectedItems = [
    ...selectedServices.map(id => {
      const service = services.find(s => s.id === id);
      return service ? { 
        id,
        name: service.name,
        price: service.selling_price,
        type: 'service' as const
      } : null;
    }),
    ...selectedPackages.map(id => {
      const pkg = packages.find(p => p.id === id);
      return pkg ? {
        id,
        name: pkg.name,
        price: pkg.price,
        type: 'package' as const
      } : null;
    })
  ].filter(Boolean);

  const subtotal = selectedItems.reduce((sum, item) => sum + (item?.price || 0), 0);
  const discountAmount = discountType === 'percentage' 
    ? (subtotal * discountValue) / 100 
    : discountType === 'fixed' 
    ? discountValue 
    : 0;
  const total = subtotal - discountAmount;

  return (
    <div className="flex h-full">
      <div className="w-2/3 p-6 space-y-6 bg-white border-r">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Selected Items</h3>
            <div className="space-y-4">
              {selectedItems.map((item) => item && (
                <div key={`${item.type}-${item.id}`} className="flex justify-between items-center">
                  <span className="text-sm">
                    {item.name}
                    <span className="ml-2 text-gray-500 text-xs">
                      ({item.type})
                    </span>
                  </span>
                  <span className="font-medium">₹{item.price}</span>
                </div>
              ))}
              
              <div className="pt-4 border-t mt-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                {discountType !== 'none' && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-₹{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold mt-2">
                  <span>Total</span>
                  <span>₹{total}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="space-y-4">
            <label className="text-sm font-medium">Discount</label>
            <Select value={discountType} onValueChange={onDiscountTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select discount type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Discount</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
            
            {discountType !== 'none' && (
              <Input
                type="number"
                placeholder={discountType === 'percentage' ? 'Enter percentage' : 'Enter amount'}
                value={discountValue}
                onChange={(e) => onDiscountValueChange(Number(e.target.value))}
                min={0}
                max={discountType === 'percentage' ? 100 : undefined}
              />
            )}
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium">Payment Method</label>
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                className="w-full"
                onClick={() => onPaymentMethodChange('cash')}
              >
                <Banknote className="mr-2 h-4 w-4" />
                Cash
              </Button>
              <Button
                type="button"
                variant={paymentMethod === 'online' ? 'default' : 'outline'}
                className="w-full"
                onClick={() => onPaymentMethodChange('online')}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Online
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              placeholder="Add any notes about this sale..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={4}
            />
          </div>

          <Button 
            className="w-full"
            size="lg"
            onClick={onPayNow}
          >
            Pay Now
          </Button>
        </div>
      </div>
    </div>
  );
};
