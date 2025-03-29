
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getTotalPrice } from '../utils/bookingUtils';
import { Appointment, Service, Package, PaymentMethod, DiscountType } from '../types';
import { ServicesSummary } from './ServicesSummary';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CheckoutSectionProps {
  appointmentId: string;
  selectedServices: string[];
  selectedPackages: string[];
  services: Service[];
  packages: Package[];
  selectedCustomer: any;
  discountType: DiscountType;
  discountValue: number;
  paymentMethod: PaymentMethod;
  notes: string;
  onDiscountTypeChange: (value: DiscountType) => void;
  onDiscountValueChange: (value: number) => void;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  onNotesChange: (value: string) => void;
  onPaymentComplete: (appointmentId?: string) => void;
  selectedStylists: Record<string, string>;
  selectedTimeSlots: Record<string, string>;
  onSaveAppointment: () => Promise<string | undefined>;
  onRemoveService: (serviceId: string) => void;
  onRemovePackage: (packageId: string) => void;
  onBackToServices: () => void;
  customizedServices: Record<string, string[]>;
  isExistingAppointment?: boolean;
  locationId?: string;
}

export const CheckoutSection: React.FC<CheckoutSectionProps> = ({
  appointmentId,
  selectedServices,
  selectedPackages,
  services,
  packages,
  selectedCustomer,
  discountType,
  discountValue,
  paymentMethod,
  notes,
  onDiscountTypeChange,
  onDiscountValueChange,
  onPaymentMethodChange,
  onNotesChange,
  onPaymentComplete,
  selectedStylists,
  selectedTimeSlots,
  onSaveAppointment,
  onRemoveService,
  onRemovePackage,
  onBackToServices,
  customizedServices,
  isExistingAppointment = false,
  locationId
}) => {
  const [couponId, setCouponId] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponAmount, setCouponAmount] = useState(0);
  const [couponName, setCouponName] = useState('');
  const [couponType, setCouponType] = useState<'percentage' | 'fixed' | null>(null);
  const [couponValue, setCouponValue] = useState(0);
  const [selectedTaxId, setSelectedTaxId] = useState<string | null>(null);
  const [taxName, setTaxName] = useState('');
  const [taxAmount, setTaxAmount] = useState(0);
  const [taxPercentage, setTaxPercentage] = useState(0);
  const [taxOptions, setTaxOptions] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Format the appointment date and time from the first time slot
  const firstTimeSlot = Object.values(selectedTimeSlots)[0] || '';
  const appointmentDate = new Date();

  const handleApplyCoupon = async () => {
    try {
      // Get coupon by code
      const { data: couponData, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode)
        .eq('is_active', true)
        .single();

      if (couponError || !couponData) {
        throw new Error(couponError?.message || 'Invalid or expired coupon code');
      }

      // Check if the coupon is still valid
      const now = new Date();
      if (couponData.valid_from && new Date(couponData.valid_from) > now) {
        throw new Error('This coupon is not valid yet');
      }
      if (couponData.valid_until && new Date(couponData.valid_until) < now) {
        throw new Error('This coupon has expired');
      }

      // Apply coupon
      setCouponId(couponData.id);
      setCouponName(couponData.name || couponData.code);
      setCouponType(couponData.discount_type);
      setCouponValue(couponData.discount_value);
      
      // Calculate coupon amount
      const subtotal = getTotalPrice(selectedServices, selectedPackages, services, packages, customizedServices);
      const amount = couponData.discount_type === 'percentage'
        ? subtotal * (couponData.discount_value / 100)
        : couponData.discount_value;
      setCouponAmount(amount);

      toast.success('Coupon applied!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to apply coupon');
      resetCoupon();
    }
  };

  const resetCoupon = () => {
    setCouponId(null);
    setCouponCode('');
    setCouponName('');
    setCouponType(null);
    setCouponValue(0);
    setCouponAmount(0);
  };

  useEffect(() => {
    const fetchTaxRates = async () => {
      try {
        const { data, error } = await supabase
          .from('tax_rates')
          .select('*')
          .order('name');

        if (error) throw error;
        
        setTaxOptions(data || []);
        
        // If there's a location ID, try to fetch the default tax for this location
        if (locationId) {
          const { data: locationData, error: locationError } = await supabase
            .from('location_settings')
            .select('service_tax_id, tax_rates (*)')
            .eq('location_id', locationId)
            .single();
            
          if (!locationError && locationData && locationData.service_tax_id) {
            setSelectedTaxId(locationData.service_tax_id);
            if (locationData.tax_rates) {
              setTaxName(locationData.tax_rates.name || '');
              setTaxPercentage(locationData.tax_rates.percentage || 0);
              
              // Calculate tax amount
              const subtotal = getTotalPrice(selectedServices, selectedPackages, services, packages, customizedServices);
              const amount = subtotal * (locationData.tax_rates.percentage / 100);
              setTaxAmount(amount);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching tax rates:', error);
      }
    };

    fetchTaxRates();
  }, [locationId, selectedServices, selectedPackages, services, packages, customizedServices]);

  const handleTaxChange = async (taxId: string) => {
    try {
      if (taxId === 'none') {
        setSelectedTaxId(null);
        setTaxName('');
        setTaxPercentage(0);
        setTaxAmount(0);
        return;
      }

      setSelectedTaxId(taxId);
      
      // Get tax details
      const { data: taxData, error: taxError } = await supabase
        .from('tax_rates')
        .select('*')
        .eq('id', taxId)
        .single();

      if (taxError || !taxData) {
        throw new Error(taxError?.message || 'Invalid tax selection');
      }

      setTaxName(taxData.name || '');
      setTaxPercentage(taxData.percentage || 0);
      
      // Calculate tax amount
      const subtotal = getTotalPrice(selectedServices, selectedPackages, services, packages, customizedServices);
      const amount = subtotal * (taxData.percentage / 100);
      setTaxAmount(amount);
    } catch (error: any) {
      toast.error(error.message || 'Failed to apply tax rate');
      setSelectedTaxId(null);
      setTaxName('');
      setTaxPercentage(0);
      setTaxAmount(0);
    }
  };

  const handlePaymentComplete = async () => {
    setIsProcessing(true);
    try {
      const appointmentId = await onSaveAppointment();
      if (appointmentId) {
        onPaymentComplete(appointmentId);
      } else {
        throw new Error('Failed to save appointment');
      }
    } catch (error) {
      console.error('Error completing payment:', error);
      toast.error('Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAppointment = async () => {
    setIsProcessing(true);
    try {
      const appointmentId = await onSaveAppointment();
      if (appointmentId) {
        toast.success('Appointment saved successfully');
      } else {
        throw new Error('Failed to save appointment');
      }
    } catch (error) {
      console.error('Error saving appointment:', error);
      toast.error('Failed to save appointment');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Left column - Services summary */}
      <div className="w-2/3 p-6 overflow-y-auto border-r">
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold">Customer Information</h3>
              <div className="text-sm mt-1">
                <p className="text-md font-medium">{selectedCustomer?.full_name || 'Guest'}</p>
                <p className="text-muted-foreground">{selectedCustomer?.email}</p>
                <p className="text-muted-foreground">{selectedCustomer?.phone}</p>
              </div>
            </div>

            <div>
              <div className="text-right">
                <p className="text-2xl font-bold">{format(appointmentDate, 'EEEE, MMMM d')}</p>
                <p className="text-muted-foreground text-sm">{firstTimeSlot}</p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <ServicesSummary
              selectedServices={selectedServices}
              selectedPackages={selectedPackages}
              services={services}
              packages={packages}
              selectedStylists={selectedStylists}
              onRemoveService={onRemoveService}
              onRemovePackage={onRemovePackage}
              customizedServices={customizedServices}
            />
          </div>

          <div className="flex justify-between mt-auto pt-6">
            <Button variant="outline" onClick={onBackToServices}>
              Back to Services
            </Button>
            <Button
              variant="default"
              onClick={handleSaveAppointment}
              disabled={isProcessing}
            >
              {isProcessing ? 'Saving...' : 'Save Appointment'}
            </Button>
          </div>
        </div>
      </div>

      {/* Right column - Payment */}
      <div className="w-1/3 p-6 overflow-y-auto">
        <div>
          <h3 className="text-lg font-semibold mb-4">Checkout Summary</h3>

          <div className="space-y-4 mb-6">
            {/* Tax Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="tax">Tax</Label>
              <Select
                value={selectedTaxId || 'none'}
                onValueChange={handleTaxChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tax rate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Tax</SelectItem>
                  {taxOptions.map((tax) => (
                    <SelectItem key={tax.id} value={tax.id}>
                      {tax.name} ({tax.percentage}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Coupon Code */}
            <div className="space-y-2">
              <Label htmlFor="couponCode">Coupon Code</Label>
              <div className="flex gap-2">
                <Input
                  id="couponCode"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Enter coupon code"
                  disabled={!!couponId}
                />
                {couponId ? (
                  <Button variant="outline" onClick={resetCoupon}>
                    Remove
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleApplyCoupon}
                    disabled={!couponCode}
                  >
                    Apply
                  </Button>
                )}
              </div>
              {couponId && (
                <p className="text-sm text-green-600">
                  {couponType === 'percentage' 
                    ? `${couponValue}% off - ${couponName}`
                    : `₹${couponValue} off - ${couponName}`}
                </p>
              )}
            </div>

            {/* Discount Type */}
            <div className="space-y-2">
              <Label htmlFor="discountType">Additional Discount</Label>
              <Select
                value={discountType}
                onValueChange={(value) => onDiscountTypeChange(value as DiscountType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select discount type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Discount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Discount Value */}
            {discountType !== 'none' && (
              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  {discountType === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'}
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  value={discountValue || ''}
                  onChange={(e) =>
                    onDiscountValueChange(parseFloat(e.target.value) || 0)
                  }
                  min={0}
                  max={discountType === 'percentage' ? 100 : undefined}
                />
              </div>
            )}

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => onPaymentMethodChange(value as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Add any notes about this appointment"
                rows={3}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{getTotalPrice(selectedServices, selectedPackages, services, packages, customizedServices).toFixed(2)}</span>
            </div>
            {couponId && (
              <div className="flex justify-between text-green-600">
                <span>Coupon</span>
                <span>-₹{couponAmount.toFixed(2)}</span>
              </div>
            )}
            {discountType !== 'none' && discountValue > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Additional Discount</span>
                <span>
                  {discountType === 'percentage'
                    ? `-${discountValue}%`
                    : `-₹${discountValue.toFixed(2)}`}
                </span>
              </div>
            )}
            {selectedTaxId && (
              <div className="flex justify-between">
                <span>{taxName} ({taxPercentage}%)</span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span>
                ₹{calculateTotal().toFixed(2)}
              </span>
            </div>
          </div>

          <Button
            className="w-full mt-6"
            onClick={handlePaymentComplete}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Complete Payment'}
          </Button>
        </div>
      </div>
    </div>
  );

  function calculateTotal() {
    const subtotal = getTotalPrice(selectedServices, selectedPackages, services, packages, customizedServices);
    let total = subtotal;
    
    // Subtract coupon amount
    total -= couponAmount;
    
    // Apply additional discount
    if (discountType === 'percentage' && discountValue > 0) {
      total -= subtotal * (discountValue / 100);
    } else if (discountType === 'fixed' && discountValue > 0) {
      total -= discountValue;
    }
    
    // Add tax
    total += taxAmount;
    
    return Math.max(0, total);
  }
};
