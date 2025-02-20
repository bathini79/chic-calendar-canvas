
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
  const getItemDetails = () => {
    const items = [];
    
    selectedServices.forEach(serviceId => {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        items.push({
          name: service.name,
          price: service.selling_price,
          type: 'service'
        });
      }
    });

    selectedPackages.forEach(packageId => {
      const pkg = packages.find(p => p.id === packageId);
      if (pkg) {
        items.push({
          name: pkg.name,
          price: pkg.price,
          type: 'package'
        });
      }
    });

    return items;
  };

  const calculateSubtotal = () => {
    return getItemDetails().reduce((total, item) => total + item.price, 0);
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    if (discountType === 'percentage') {
      return (subtotal * discountValue) / 100;
    }
    if (discountType === 'fixed') {
      return discountValue;
    }
    return 0;
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount();
  };

  return (
    <div className="flex h-full">
      <div className="w-2/3 p-6 space-y-6">
        <h3 className="text-lg font-medium">Checkout Details</h3>
        
        <Card>
          <CardContent className="pt-6 space-y-4">
            {getItemDetails().map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm font-medium">{item.name}</span>
                <span className="text-sm">₹{item.price}</span>
              </div>
            ))}
            
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-medium">Subtotal:</span>
                <span>₹{calculateSubtotal()}</span>
              </div>
              
              {discountType !== 'none' && (
                <div className="flex justify-between items-center text-green-600">
                  <span>Discount:</span>
                  <span>-₹{calculateDiscount()}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center font-bold text-lg mt-2">
                <span>Total:</span>
                <span>₹{calculateTotal()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
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
            <label className="text-sm font-medium">Sales Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Add any notes about this sale..."
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onPayNow} className="w-full md:w-auto">
            Pay Now
          </Button>
        </div>
      </div>
    </div>
  );
};
