import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/utils";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Customer, Service, Package, StylistSelection } from "../types";
import { getTotalPrice, getTotalDuration, getFinalPrice, getMembershipDiscount } from "../utils/bookingUtils";
import { useCustomerMemberships } from "@/hooks/use-customer-memberships";
import { Trash2, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CheckoutSectionProps {
  selectedCustomer: Customer | null;
  selectedServices: string[];
  selectedPackages: string[];
  services: Service[];
  packages: Package[];
  discountType: "none" | "percentage" | "fixed";
  discountValue: number;
  paymentMethod: string;
  notes: string;
  onDiscountTypeChange: (type: "none" | "percentage" | "fixed") => void;
  onDiscountValueChange: (value: number) => void;
  onPaymentMethodChange: (method: string) => void;
  onNotesChange: (notes: string) => void;
  onSaveAppointment: () => Promise<string | undefined>;
  onPaymentComplete: (appointmentId?: string) => void;
  selectedStylists: StylistSelection;
  selectedTimeSlots: Record<string, string>;
  onRemoveService: (serviceId: string) => void;
  onRemovePackage: (packageId: string) => void;
  onBackToServices: () => void;
  customizedServices: Record<string, string[]>;
  isExistingAppointment?: boolean;
  appointmentId?: string;
  locationId?: string;
}

export function CheckoutSection({
  selectedCustomer,
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
  onSaveAppointment,
  onPaymentComplete,
  selectedStylists,
  selectedTimeSlots,
  onRemoveService,
  onRemovePackage,
  onBackToServices,
  customizedServices,
  isExistingAppointment,
  appointmentId,
  locationId
}: CheckoutSectionProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [subtotal, setSubtotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [taxRates, setTaxRates] = useState<any[]>([]);
  const [selectedTaxId, setSelectedTaxId] = useState<string | null>(null);
  const [membershipDiscount, setMembershipDiscount] = useState<number>(0);
  const [appliedMembershipId, setAppliedMembershipId] = useState<string | null>(null);
  const [appliedMembershipName, setAppliedMembershipName] = useState<string | null>(null);
  
  const { customerMemberships, isLoading: isMembershipsLoading, fetchCustomerMemberships, getApplicableMembershipDiscount } = useCustomerMemberships();

  useEffect(() => {
    if (selectedCustomer?.id) {
      fetchCustomerMemberships(selectedCustomer.id);
    } else {
      setMembershipDiscount(0);
      setAppliedMembershipId(null);
      setAppliedMembershipName(null);
    }
  }, [selectedCustomer, fetchCustomerMemberships]);

  // Fetch tax rates when component mounts
  useEffect(() => {
    const fetchTaxRates = async () => {
      try {
        const { data, error } = await fetch(
          'tax_rates',
          locationId ? { location_id: locationId } : undefined
        );
        if (error) throw error;
        setTaxRates(data || []);
        
        // Find default tax rate if exists
        const defaultTax = data?.find((tax: any) => tax.is_default);
        if (defaultTax) {
          setSelectedTaxId(defaultTax.id);
          setTaxRate(defaultTax.percentage);
        }
      } catch (error) {
        console.error("Error fetching tax rates:", error);
      }
    };
    
    const fetch = async (table: string, equalityFilter?: Record<string, any>) => {
      let query = supabase.from(table).select('*');
      
      if (equalityFilter) {
        const key = Object.keys(equalityFilter)[0];
        query = query.eq(key, equalityFilter[key]);
      }
      
      return await query;
    };

    fetchTaxRates();
  }, [locationId]);

  // Calculate subtotal and apply membership discounts
  useEffect(() => {
    const baseSubtotal = getTotalPrice(
      selectedServices,
      selectedPackages,
      services,
      packages,
      customizedServices
    );
    
    setSubtotal(baseSubtotal);
    
    // Check if customer has applicable memberships
    let bestMembershipDiscount = 0;
    let bestMembershipId = null;
    let bestMembershipName = null;
    
    // For services
    selectedServices.forEach(serviceId => {
      const servicePrice = services.find(s => s.id === serviceId)?.selling_price || 0;
      const discount = getApplicableMembershipDiscount(serviceId, null, servicePrice);
      
      if (discount && discount.calculatedDiscount > bestMembershipDiscount) {
        bestMembershipDiscount = discount.calculatedDiscount;
        bestMembershipId = discount.membershipId;
        bestMembershipName = discount.membershipName;
      }
    });
    
    // For packages
    selectedPackages.forEach(packageId => {
      const packagePrice = packages.find(p => p.id === packageId)?.price || 0;
      const discount = getApplicableMembershipDiscount(null, packageId, packagePrice);
      
      if (discount && discount.calculatedDiscount > bestMembershipDiscount) {
        bestMembershipDiscount = discount.calculatedDiscount;
        bestMembershipId = discount.membershipId;
        bestMembershipName = discount.membershipName;
      }
    });
    
    // Set membership discount info
    setMembershipDiscount(bestMembershipDiscount);
    setAppliedMembershipId(bestMembershipId);
    setAppliedMembershipName(bestMembershipName);
    
    // Calculate total after discounts (manual + membership)
    const afterManualDiscount = getFinalPrice(baseSubtotal, discountType, discountValue);
    const finalSubtotal = Math.max(0, afterManualDiscount - bestMembershipDiscount);
    
    // Calculate tax amount
    const calculatedTaxAmount = (finalSubtotal * taxRate) / 100;
    setTaxAmount(calculatedTaxAmount);
    
    // Calculate final price
    setTotalPrice(finalSubtotal + calculatedTaxAmount);
  }, [
    selectedServices, 
    selectedPackages, 
    services, 
    packages, 
    customizedServices, 
    discountType, 
    discountValue, 
    taxRate, 
    getApplicableMembershipDiscount,
    customerMemberships
  ]);

  const handleTaxRateChange = (taxId: string) => {
    if (taxId === "none") {
      setSelectedTaxId(null);
      setTaxRate(0);
    } else {
      setSelectedTaxId(taxId);
      const selectedTax = taxRates.find(tax => tax.id === taxId);
      if (selectedTax) {
        setTaxRate(selectedTax.percentage);
      }
    }
  };

  const handleCheckout = async () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    if (selectedServices.length === 0 && selectedPackages.length === 0) {
      toast.error("Please select at least one service or package");
      return;
    }

    setIsProcessing(true);
    try {
      // Save appointment data with membership info
      const appointmentId = await onSaveAppointment();
      
      // If we successfully saved the appointment, complete the payment
      if (appointmentId) {
        onPaymentComplete(appointmentId);
      }
    } catch (error) {
      console.error("Error during checkout:", error);
      toast.error("There was an error processing your payment");
    } finally {
      setIsProcessing(false);
    }
  };

  const duration = getTotalDuration(
    selectedServices,
    selectedPackages,
    services,
    packages,
    customizedServices
  );

  // Helper for calculating service or package price with membership
  const getItemPrice = (id: string, type: 'service' | 'package') => {
    if (type === 'service') {
      const service = services.find(s => s.id === id);
      return service?.selling_price || 0;
    } else {
      const pkg = packages.find(p => p.id === id);
      return pkg?.price || 0;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold">Checkout</h3>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mb-8">
          <h4 className="text-sm font-medium mb-3">Services & Packages</h4>
          <div className="space-y-2">
            {selectedServices.map((serviceId) => {
              const service = services.find((s) => s.id === serviceId);
              if (!service) return null;
              return (
                <Card key={serviceId} className="bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-medium">{service.name}</h5>
                        <p className="text-sm text-muted-foreground">
                          Duration: {service.duration} min
                        </p>
                        {selectedTimeSlots[serviceId] && (
                          <p className="text-sm text-muted-foreground">
                            Time: {selectedTimeSlots[serviceId]}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-medium">
                            {formatPrice(service.selling_price)}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveService(serviceId)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {selectedPackages.map((packageId) => {
              const pkg = packages.find((p) => p.id === packageId);
              if (!pkg) return null;
              return (
                <Card key={packageId} className="bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-medium">{pkg.name}</h5>
                        <p className="text-sm text-muted-foreground">
                          Duration:{" "}
                          {pkg.duration ||
                            pkg.package_services?.reduce(
                              (total, ps) => total + ps.service.duration,
                              0
                            ) ||
                            0}{" "}
                          min
                        </p>
                        {selectedTimeSlots[packageId] && (
                          <p className="text-sm text-muted-foreground">
                            Time: {selectedTimeSlots[packageId]}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-medium">{formatPrice(pkg.price)}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemovePackage(packageId)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="mb-8">
          <h4 className="text-sm font-medium mb-3">Payment Details</h4>
          <Card className="bg-gray-50">
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              
              {/* Manual Discount */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Discount</span>
                  <Select value={discountType} onValueChange={(v) => onDiscountTypeChange(v as "none" | "percentage" | "fixed")}>
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed</SelectItem>
                    </SelectContent>
                  </Select>
                  {discountType !== "none" && (
                    <input
                      type="number"
                      value={discountValue}
                      onChange={(e) => onDiscountValueChange(Number(e.target.value))}
                      className="w-20 h-8 border rounded-md px-2"
                      min={0}
                      max={discountType === "percentage" ? 100 : undefined}
                    />
                  )}
                </div>
                {discountType !== "none" && discountValue > 0 && (
                  <span className="text-green-600">
                    -{formatPrice(
                      discountType === "percentage"
                        ? (subtotal * discountValue) / 100
                        : Math.min(discountValue, subtotal)
                    )}
                  </span>
                )}
              </div>
              
              {/* Membership Discount */}
              {membershipDiscount > 0 && appliedMembershipName && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Membership Discount</span>
                    <Badge variant="outline" className="ml-2">
                      <Tag className="h-3 w-3 mr-1" />
                      {appliedMembershipName}
                    </Badge>
                  </div>
                  <span className="text-green-600">
                    -{formatPrice(membershipDiscount)}
                  </span>
                </div>
              )}
              
              {/* Tax Rate */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Tax</span>
                  <Select
                    value={selectedTaxId || "none"}
                    onValueChange={handleTaxRateChange}
                  >
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {taxRates.map((tax) => (
                        <SelectItem key={tax.id} value={tax.id}>
                          {tax.name} ({tax.percentage}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {taxAmount > 0 && <span>{formatPrice(taxAmount)}</span>}
              </div>
              
              <div className="pt-2 mt-2 border-t flex justify-between items-center font-medium">
                <span>Total</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <div className="mb-4">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              placeholder="Add any notes about this appointment..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              className="resize-none"
            />
          </div>
        </div>
      </div>

      <div className="p-6 border-t flex justify-between">
        <Button variant="outline" onClick={onBackToServices}>
          Back to Services
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              const appointmentId = await onSaveAppointment();
              if (appointmentId) {
                toast.success("Appointment saved");
              }
            }}
          >
            Save
          </Button>
          <Button 
            onClick={handleCheckout}
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "Complete Payment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
