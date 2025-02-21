
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Banknote, CheckCircle2, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from 'date-fns';
import type { Service, Package } from "../types";

interface CheckoutSectionProps {
  appointmentId: string;
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
  onPaymentComplete: () => void;
}

interface SummaryViewProps {
  appointmentId: string;
  selectedItems: Array<{
    id: string;
    name: string;
    price: number;
    type: 'service' | 'package';
  }>;
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  discountType: string;
  discountValue: number;
  completedAt: string;
}

const SummaryView: React.FC<SummaryViewProps> = ({
  appointmentId,
  selectedItems,
  subtotal,
  discountAmount,
  total,
  paymentMethod,
  discountType,
  discountValue,
  completedAt,
}) => {
  return (
    <Card className="bg-white">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle2 className="h-6 w-6" />
            <h3 className="text-lg font-semibold">Payment Completed</h3>
          </div>
          <div className="text-sm text-gray-500">
            {format(new Date(completedAt), 'dd MMM yyyy, hh:mm a')}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Transaction ID</span>
            <span className="font-mono">{appointmentId}</span>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Items</h4>
            {selectedItems.map((item) => (
              <div key={`${item.type}-${item.id}`} className="flex justify-between text-sm py-1">
                <span>
                  {item.name}
                  <span className="ml-2 text-gray-500 text-xs">
                    ({item.type})
                  </span>
                </span>
                <span>₹{item.price}</span>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            {discountType !== 'none' && (
              <div className="flex justify-between text-sm text-green-600">
                <span>
                  Discount ({discountType === 'percentage' ? `${discountValue}%` : '₹' + discountValue})
                </span>
                <span>-₹{discountAmount}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2">
              <span>Total Paid</span>
              <span>₹{total}</span>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between text-sm">
              <span>Payment Method</span>
              <span className="flex items-center">
                {paymentMethod === 'cash' ? <Banknote className="h-4 w-4 mr-1" /> : <CreditCard className="h-4 w-4 mr-1" />}
                {paymentMethod === 'cash' ? 'Cash' : 'Online'}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-6">
          <Button className="w-full" variant="outline" onClick={() => window.print()}>
            <ClipboardList className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const CheckoutSection: React.FC<CheckoutSectionProps> = ({
  appointmentId,
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
}) => {
  const [isPaymentCompleted, setIsPaymentCompleted] = React.useState(false);
  const [completedAt, setCompletedAt] = React.useState("");

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

  const handlePayment = async () => {
    if (!appointmentId) {
      toast.error('Invalid appointment ID');
      return;
    }

    try {
      const now = new Date().toISOString();
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          status: 'completed',
          payment_method: paymentMethod,
          discount_type: discountType,
          discount_value: discountValue,
          total_price: total,
          notes: notes
        })
        .eq('id', appointmentId);

      if (appointmentError) throw appointmentError;

      const { error: bookingsError } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('appointment_id', appointmentId);

      if (bookingsError) throw bookingsError;

      setCompletedAt(now);
      setIsPaymentCompleted(true);
      toast.success('Payment completed successfully');
      onPaymentComplete();
    } catch (error: any) {
      console.error('Error completing payment:', error);
      toast.error(error.message || 'Failed to complete payment');
    }
  };

  if (isPaymentCompleted) {
    return (
      <SummaryView
        appointmentId={appointmentId}
        selectedItems={selectedItems}
        subtotal={subtotal}
        discountAmount={discountAmount}
        total={total}
        paymentMethod={paymentMethod}
        discountType={discountType}
        discountValue={discountValue}
        completedAt={completedAt}
      />
    );
  }

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
            onClick={handlePayment}
            disabled={!appointmentId}
          >
            Complete Payment
          </Button>
        </div>
      </div>
    </div>
  );
};
