
import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Customer } from "../types";

interface PaymentSectionProps {
  paymentCompleted: boolean;
  selectedServices: string[];
  services: any[];
  employees: any[];
  selectedStylists: Record<string, string>;
  selectedCustomer: Customer | null;
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
  onBack: () => void;
  onSave: () => void;
  onClose: () => void;
}

export function PaymentSection({
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
  onBack,
  onSave,
  onClose,
}: PaymentSectionProps) {
  if (paymentCompleted) {
    return (
      <div className="text-center space-y-6">
        <div className="text-green-600 text-2xl font-medium">
          Payment Completed Successfully!
        </div>
        <div className="max-w-md mx-auto p-6 border rounded-lg">
          <h3 className="text-lg font-medium mb-4">Transaction Summary</h3>
          <div className="space-y-2 text-left">
            <p><span className="font-medium">Customer:</span> {selectedCustomer?.full_name}</p>
            <p><span className="font-medium">Payment Method:</span> {paymentMethod}</p>
            <p><span className="font-medium">Amount Paid:</span> ₹{getFinalPrice()}</p>
            <p><span className="font-medium">Status:</span> Completed</p>
          </div>
        </div>
        <Button onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="border rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Selected Services</h3>
        <div className="space-y-4">
          {selectedServices.map((serviceId) => {
            const service = services?.find((s) => s.id === serviceId);
            const stylist = employees.find((e: any) => e.id === selectedStylists[serviceId]);
            return (
              <div key={serviceId} className="flex justify-between items-start border-b pb-4">
                <div>
                  <p className="font-medium">{service?.name}</p>
                  <p className="text-sm text-gray-600">Stylist: {stylist?.name}</p>
                </div>
                <p className="font-medium">₹{service?.selling_price}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border rounded-lg p-6 space-y-4">
        <h3 className="text-xl font-semibold mb-4">Payment Details</h3>
        
        <div className="space-y-4">
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
            <Textarea
              value={appointmentNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Add notes for this appointment"
            />
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Original Price:</span>
            <span>₹{getTotalPrice()}</span>
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
          <div className="flex justify-between items-center font-bold text-xl mt-2">
            <span>Final Price:</span>
            <span>₹{getFinalPrice()}</span>
          </div>
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
  );
}
