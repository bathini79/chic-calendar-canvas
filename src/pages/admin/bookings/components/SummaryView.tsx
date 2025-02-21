
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ClipboardList, CreditCard, Banknote } from "lucide-react";
import { format } from 'date-fns';

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
  paymentMethod: 'cash' | 'online';
  discountType: 'none' | 'percentage' | 'fixed';
  discountValue: number;
  completedAt: string;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
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
