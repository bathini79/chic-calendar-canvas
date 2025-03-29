
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash, ArrowLeft } from "lucide-react";
import { Service, Package } from '../types';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getPriceWithDiscount } from '../utils/bookingUtils';

interface CheckoutSectionProps {
  selectedCustomer: any;
  selectedServices: string[];
  selectedPackages: string[];
  services: Service[];
  packages: Package[];
  discountType: string;
  discountValue: number;
  paymentMethod: string;
  notes: string;
  appointmentId?: string;
  onDiscountTypeChange: (type: string) => void;
  onDiscountValueChange: (value: number) => void;
  onPaymentMethodChange: (method: string) => void;
  onNotesChange: (notes: string) => void;
  onPaymentComplete: (appointmentId?: string) => void;
  selectedStylists: Record<string, string>;
  selectedTimeSlots: Record<string, string>;
  onSaveAppointment: (params?: any) => Promise<string | undefined>;
  onRemoveService: (id: string) => void;
  onRemovePackage: (id: string) => void;
  onBackToServices: () => void;
  customizedServices: Record<string, string[]>;
  isExistingAppointment?: boolean;
  locationId?: string;
}

export const CheckoutSection: React.FC<CheckoutSectionProps> = ({
  selectedCustomer,
  selectedServices,
  selectedPackages,
  services,
  packages,
  discountType,
  discountValue,
  paymentMethod,
  notes,
  appointmentId,
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
  isExistingAppointment,
  locationId
}) => {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Calculate subtotal and final price
  const calculateSubtotal = () => {
    let subtotal = 0;
    
    // Add service prices
    selectedServices.forEach(serviceId => {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        subtotal += service.selling_price;
      }
    });
    
    // Add package prices
    selectedPackages.forEach(packageId => {
      const pkg = packages.find(p => p.id === packageId);
      if (pkg) {
        subtotal += pkg.price;
      }
    });
    
    return subtotal;
  };
  
  const subtotal = calculateSubtotal();
  const finalPrice = getPriceWithDiscount(subtotal, discountType, discountValue);
  
  // For editing price line items
  const [adjustedPrices, setAdjustedPrices] = useState<Record<string, number>>({});
  
  const handlePriceChange = (itemId: string, newPrice: number) => {
    setAdjustedPrices({
      ...adjustedPrices,
      [itemId]: newPrice
    });
  };
  
  // Get service or package by ID
  const getItemById = (id: string) => {
    const service = services.find(s => s.id === id);
    if (service) return { ...service, type: 'service' };
    
    const pkg = packages.find(p => p.id === id);
    if (pkg) return { ...pkg, type: 'package' };
    
    return null;
  };

  // Handle checkout process
  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      // Prepare parameters for saving the appointment
      const params = {
        appointmentId: appointmentId, // Will be undefined for new appointments
        adjustedPrices,
        total: finalPrice,
      };

      const savedAppointmentId = await onSaveAppointment(params);
      
      if (savedAppointmentId) {
        // Update the appointment query data to reflect the new appointment
        if (locationId) {
          const startDate = Object.values(selectedTimeSlots)[0];
          if (startDate) {
            const dateString = format(new Date(startDate), 'yyyy-MM-dd');
            queryClient.invalidateQueries({
              queryKey: ['appointments', dateString, locationId]
            });
          }
        }
        
        toast.success("Payment completed successfully");
        onPaymentComplete(savedAppointmentId);
      }
    } catch (error) {
      console.error('Error during checkout:', error);
      toast.error("Failed to process payment");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 flex-shrink-0 border-b">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="mr-2"
            onClick={onBackToServices}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h3 className="text-lg font-semibold">Checkout</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Selected Services */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Selected Items</h4>
            <div className="space-y-3">
              {selectedServices.map(serviceId => {
                const service = services.find(s => s.id === serviceId);
                if (!service) return null;
                
                const price = adjustedPrices[serviceId] !== undefined ? 
                  adjustedPrices[serviceId] : service.selling_price;
                
                const stylist = selectedStylists[serviceId] 
                  ? service.name 
                  : 'Any Stylist';
                
                return (
                  <div key={serviceId} className="flex items-center justify-between py-2 border-b">
                    <div className="flex-1">
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-gray-500">
                        {stylist} • {service.duration} mins
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span className="px-2">₹</span>
                      <Input 
                        type="number"
                        className="w-20 text-right"
                        value={price}
                        onChange={(e) => handlePriceChange(serviceId, parseFloat(e.target.value) || 0)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 text-gray-500"
                        onClick={() => onRemoveService(serviceId)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              
              {selectedPackages.map(packageId => {
                const pkg = packages.find(p => p.id === packageId);
                if (!pkg) return null;
                
                const price = adjustedPrices[packageId] !== undefined ? 
                  adjustedPrices[packageId] : pkg.price;
                
                return (
                  <div key={packageId} className="flex items-center justify-between py-2 border-b">
                    <div className="flex-1">
                      <p className="font-medium">{pkg.name}</p>
                      <p className="text-sm text-gray-500">
                        Package • {pkg.duration} mins
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span className="px-2">₹</span>
                      <Input 
                        type="number"
                        className="w-20 text-right"
                        value={price}
                        onChange={(e) => handlePriceChange(packageId, parseFloat(e.target.value) || 0)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 text-gray-500"
                        onClick={() => onRemovePackage(packageId)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Discount */}
          <div className="space-y-2">
            <Label>Discount</Label>
            <div className="flex items-center gap-2">
              <Select value={discountType} onValueChange={onDiscountTypeChange}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Discount Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
              
              {discountType !== 'none' && (
                <div className="flex items-center">
                  {discountType === 'percentage' && <span>%</span>}
                  {discountType === 'fixed' && <span>₹</span>}
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(e) => onDiscountValueChange(parseFloat(e.target.value) || 0)}
                    className="w-20 mx-2"
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea 
              placeholder="Add notes about this appointment"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              className="h-24"
            />
          </div>
        </div>
      </div>
      
      {/* Payment Summary */}
      <div className="p-6 border-t mt-auto space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Subtotal</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        
        {discountType !== 'none' && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Discount</span>
            <span>₹{(subtotal - finalPrice).toFixed(2)}</span>
          </div>
        )}
        
        <div className="flex justify-between items-center text-lg font-bold">
          <span>Total</span>
          <span>₹{finalPrice.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={onBackToServices}
          >
            Edit Services
          </Button>
          
          <Button
            disabled={isProcessing}
            onClick={handleCheckout}
          >
            {isProcessing ? "Processing..." : "Complete Payment"}
          </Button>
        </div>
      </div>
    </div>
  );
};
