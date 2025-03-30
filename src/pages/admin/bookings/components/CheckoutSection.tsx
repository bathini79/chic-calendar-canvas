import React from 'react';
import { formatPrice } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCoupon } from "../hooks/useCoupon";
import { useTax } from "../hooks/useTax";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppointmentStatus } from "@/types/appointment";
import { SummaryView } from './SummaryView';

interface CheckoutSectionProps {
  items: any[];
  setItems: React.Dispatch<React.SetStateAction<any[]>>;
  couponCode: string;
  setCouponCode: React.Dispatch<React.SetStateAction<string>>;
  customerId: string;
  employeeId: string;
  locationId: string;
  notes: string;
  setNotes: React.Dispatch<React.SetStateAction<string>>;
  employee: any;
  startTime: Date;
  setCouponDiscount: (discount: number) => void;
  setTaxAmount: (tax: number) => void;
  selectedEmployee: any;
  selectedDate: Date;
  existingAppointmentId: string | undefined;
  appointmentStatus: AppointmentStatus | undefined;
  selectedTime: string;
  status: AppointmentStatus;
  onStatusChange: (status: AppointmentStatus) => void;
  isTaxable: boolean;
  setIsTaxable: React.Dispatch<React.SetStateAction<boolean>>;
  onSaveAppointment: () => Promise<void>;
  onDeleteAppointment: () => Promise<void>;
  showSummaryView: boolean;
  savingAppointment: boolean;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
}

export const CheckoutSection: React.FC<CheckoutSectionProps> = ({
  items,
  setItems,
  couponCode,
  setCouponCode,
  customerId,
  employeeId,
  locationId,
  notes,
  setNotes,
  employee,
  startTime,
  setCouponDiscount,
  setTaxAmount,
  selectedEmployee,
  selectedDate,
  existingAppointmentId,
  appointmentStatus,
  selectedTime,
  status,
  onStatusChange,
  isTaxable,
  setIsTaxable,
  onSaveAppointment,
  onDeleteAppointment,
  showSummaryView,
  savingAppointment,
  paymentMethod,
  setPaymentMethod
}) => {
  const subtotal = items.reduce((acc, item) => acc + item.price, 0);
  const { applyCoupon, couponDiscount, isLoading: isCouponLoading } = useCoupon(
    subtotal,
    setCouponDiscount
  );
  const { calculateTax, taxAmount, isLoading: isTaxLoading } = useTax(
    subtotal,
    locationId,
    isTaxable,
    setTaxAmount
  );

  const total = subtotal - couponDiscount + taxAmount;

  const handleApplyCoupon = async () => {
    if (couponCode) {
      await applyCoupon(couponCode);
    }
  };

  const handleToggleTax = async (checked: boolean) => {
    setIsTaxable(checked);
    await calculateTax(checked);
  };

  const handleCalculateTax = async () => {
    await calculateTax(isTaxable);
  };

  return (
    <div className="w-[350px] border-l h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="text-lg font-semibold flex justify-between items-center">
          <span>Order Summary</span>
          {/* Removed status dropdown from here */}
        </div>

        <ScrollArea className="h-[200px] pr-4">
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>{item.name}</span>
                <span>{formatPrice(item.price)}</span>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span>Coupon</span>
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />
              <Button
                size="sm"
                onClick={handleApplyCoupon}
                disabled={isCouponLoading}
              >
                Apply
              </Button>
            </div>
          </div>

          {couponDiscount > 0 && (
            <div className="flex justify-between">
              <span>Coupon Discount</span>
              <span className="text-green-500">
                -{formatPrice(couponDiscount)}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span>Tax</span>
            <Switch id="tax" checked={isTaxable} onCheckedChange={handleToggleTax} />
          </div>

          {taxAmount > 0 && (
            <div className="flex justify-between">
              <span>Tax Amount</span>
              <span>{formatPrice(taxAmount)}</span>
            </div>
          )}

          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div>
            <label
              htmlFor="paymentMethod"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Payment Method
            </label>
            <div className="mt-2">
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              Notes
            </label>
            <div className="mt-2">
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        <Button
          className="w-full"
          onClick={onSaveAppointment}
          disabled={savingAppointment}
        >
          {savingAppointment ? "Saving..." : "Save Appointment"}
        </Button>

        {existingAppointmentId && (
          <Button
            variant="outline"
            className="w-full text-destructive border-destructive hover:bg-destructive/10"
            onClick={onDeleteAppointment}
          >
            Delete Appointment
          </Button>
        )}
      </div>
    </div>
  );
};
