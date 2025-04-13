
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  Banknote,
  Globe,
  Tag,
  Star,
  Sparkles
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Coupon } from "@/types/coupon";
import { useCouponSelection } from "../hooks/useCouponSelection";
import { 
  DiscountType, 
  Service, 
  Package, 
  Customer, 
  PaymentMethod 
} from "../types";
import { formatPrice } from "@/lib/utils";
import { useLoyaltyInCheckout } from "../hooks/useLoyaltyInCheckout";

interface CheckoutSectionProps {
  selectedServices: string[];
  selectedPackages: string[];
  services: Service[];
  packages: Package[];
  discountType: DiscountType;
  setDiscountType: (type: DiscountType) => void;
  discountValue: number;
  setDiscountValue: (value: number) => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  notes: string;
  setNotes: (notes: string) => void;
  handleCheckout: () => void;
  loadingCheckout: boolean;
  selectedCustomer: Customer;
  customizedServices: Record<string, string[]>;
  appointmentId?: string;
  loadingPayment?: boolean;
  existingAppointment?: any;
  handleSaveAppointment?: () => void;
  handlePaymentComplete?: () => void;
  appliedTaxId?: string | null;
  taxAmount?: number;
}

const CheckoutSection: React.FC<CheckoutSectionProps> = ({
  selectedServices,
  selectedPackages,
  services,
  packages,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  paymentMethod,
  setPaymentMethod,
  notes,
  setNotes,
  handleCheckout,
  loadingCheckout,
  selectedCustomer,
  customizedServices,
  appointmentId,
  loadingPayment,
  existingAppointment,
  handleSaveAppointment,
  handlePaymentComplete,
  appliedTaxId,
  taxAmount = 0,
}) => {
  const [activeCouponId, setActiveCouponId] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponName, setCouponName] = useState<string | null>(null);
  const [couponAmount, setCouponAmount] = useState<number | null>(null);
  const [customerMemberships, setCustomerMemberships] = useState<any[]>([]);
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  const [membershipDiscount, setMembershipDiscount] = useState(0);
  const [membershipName, setMembershipName] = useState<string | null>(null);

  // Get customer memberships
  const { data: memberships = [] } = useQuery({
    queryKey: ["customer-memberships", selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer?.id) return [];
      
      const { data, error } = await supabase
        .from("customer_memberships")
        .select(`
          id,
          membership_id,
          status,
          start_date,
          end_date,
          memberships:membership_id(
            id, 
            name,
            description,
            discount_type,
            discount_value,
            max_discount_value,
            min_billing_amount,
            validity_period,
            validity_unit,
            applicable_services,
            applicable_packages
          )
        `)
        .eq("customer_id", selectedCustomer.id)
        .eq("status", "active")
        .gte("end_date", new Date().toISOString());
      
      if (error) {
        console.error("Error fetching customer memberships:", error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!selectedCustomer?.id
  });

  useEffect(() => {
    if (memberships.length > 0) {
      setCustomerMemberships(memberships);
    } else {
      setCustomerMemberships([]);
      setSelectedMembershipId(null);
      setMembershipDiscount(0);
      setMembershipName(null);
    }
  }, [memberships]);

  // Get coupons
  const { data: coupons = [] } = useQuery({
    queryKey: ["coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("is_active", true);
      
      if (error) {
        console.error("Error fetching coupons:", error);
        return [];
      }
      
      return data || [];
    }
  });

  const {
    validateCouponForSelection,
  } = useCouponSelection();

  // Calculate subtotal
  const calcSubtotal = () => {
    let total = 0;
    
    // Sum up selected services
    for (const serviceId of selectedServices) {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        total += service.selling_price;
      }
    }
    
    // Sum up selected packages
    for (const packageId of selectedPackages) {
      const pkg = packages.find(p => p.id === packageId);
      if (pkg) {
        total += pkg.price;
        
        // Add any customized services that aren't part of the package
        const customServiceIds = customizedServices[packageId] || [];
        for (const customServiceId of customServiceIds) {
          const customService = services.find(s => s.id === customServiceId);
          if (customService) {
            const packageServices = pkg.package_services?.map(ps => ps.service_id);
            const isPartOfPackage = packageServices?.includes(customServiceId);
            
            if (!isPartOfPackage) {
              total += customService.selling_price;
            }
          }
        }
      }
    }
    
    return total;
  };

  const subtotal = calcSubtotal();

  // Calculate discount
  const calculateDiscount = (discountType: DiscountType, value: number) => {
    if (discountType === "percentage") {
      return (subtotal * value) / 100;
    } else if (discountType === "fixed") {
      return value;
    }
    return 0;
  };

  const discount = calculateDiscount(discountType, discountValue);
  const discountedSubtotal = Math.max(0, subtotal - discount);

  // Apply membership discount
  useEffect(() => {
    if (!selectedMembershipId) {
      setMembershipDiscount(0);
      setMembershipName(null);
      return;
    }
    
    const selectedMembership = customerMemberships.find(m => m.membership_id === selectedMembershipId);
    if (!selectedMembership) return;
    
    const membership = selectedMembership.memberships;
    
    // Check if membership applies to selected services/packages
    const isApplicable = (): boolean => {
      // If membership applies to all, no need to check further
      if (membership.apply_to_all) return true;
      
      // Check if selected services are covered by the membership
      const applicableServiceIds = membership.applicable_services || [];
      const hasApplicableService = selectedServices.some(id => applicableServiceIds.includes(id));
      
      // Check if selected packages are covered by the membership
      const applicablePackageIds = membership.applicable_packages || [];
      const hasApplicablePackage = selectedPackages.some(id => applicablePackageIds.includes(id));
      
      return hasApplicableService || hasApplicablePackage;
    };
    
    // Calculate the membership discount
    if (isApplicable()) {
      const minBillingAmount = membership.min_billing_amount || 0;
      
      if (subtotal >= minBillingAmount) {
        let calculatedDiscount = 0;
        
        if (membership.discount_type === "percentage") {
          calculatedDiscount = (discountedSubtotal * membership.discount_value) / 100;
        } else if (membership.discount_type === "fixed") {
          calculatedDiscount = membership.discount_value;
        }
        
        // Apply max discount value if set
        if (membership.max_discount_value && calculatedDiscount > membership.max_discount_value) {
          calculatedDiscount = membership.max_discount_value;
        }
        
        setMembershipDiscount(calculatedDiscount);
        setMembershipName(membership.name);
      } else {
        setMembershipDiscount(0);
        setMembershipName(null);
      }
    } else {
      setMembershipDiscount(0);
      setMembershipName(null);
    }
  }, [selectedMembershipId, customerMemberships, subtotal, discountedSubtotal, selectedServices, selectedPackages]);

  // Apply coupon
  const applyCoupon = async (couponId: string) => {
    if (!couponId) {
      setActiveCouponId(null);
      setCouponDiscount(0);
      setCouponName(null);
      setCouponAmount(null);
      return;
    }
    
    try {
      const selectedCoupon = coupons.find((c: Coupon) => c.id === couponId);
      if (!selectedCoupon) return;
      
      const validation = await validateCouponForSelection(
        selectedCoupon,
        selectedServices,
        selectedPackages,
        services,
        packages,
        discountedSubtotal
      );
      
      if (validation.isValid) {
        setActiveCouponId(couponId);
        setCouponDiscount(validation.discountAmount);
        setCouponName(selectedCoupon.code);
        setCouponAmount(validation.discountAmount);
      } else {
        setActiveCouponId(null);
        setCouponDiscount(0);
        setCouponName(null);
        setCouponAmount(null);
        console.log("Coupon validation failed:", validation.message);
      }
    } catch (error) {
      console.error("Error applying coupon:", error);
    }
  };

  useEffect(() => {
    // If coupon is applied, recalculate the discount when the subtotal changes
    if (activeCouponId) {
      applyCoupon(activeCouponId);
    }
  }, [discountedSubtotal]);

  // Loyalty Points Integration
  const {
    isLoyaltyEnabled,
    pointsToEarn,
    customerPoints,
    usePoints,
    pointsToRedeem,
    pointsDiscountAmount,
    maxPointsToRedeem,
    minRedemptionPoints,
    pointValue,
    setUsePoints,
    setPointsToRedeem
  } = useLoyaltyInCheckout({
    customerId: selectedCustomer?.id,
    selectedServices,
    selectedPackages,
    services,
    packages,
    subtotal,
    discountedSubtotal: discountedSubtotal - membershipDiscount - couponDiscount 
  });

  // Final total after all discounts
  const total = Math.max(0, discountedSubtotal - membershipDiscount - couponDiscount - pointsDiscountAmount + taxAmount);

  const handleSave = () => {
    if (handleSaveAppointment) {
      handleSaveAppointment();
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-6">Payment Details</h2>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="payment-method">Payment Method</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <Button
              variant={paymentMethod === "cash" ? "default" : "outline"}
              className={`flex items-center ${paymentMethod === "cash" ? "bg-green-600 hover:bg-green-700" : ""}`}
              onClick={() => setPaymentMethod("cash")}
              type="button"
            >
              <Banknote className="w-4 h-4 mr-2" />
              Cash
            </Button>
            <Button
              variant={paymentMethod === "card" ? "default" : "outline"}
              className={`flex items-center ${paymentMethod === "card" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
              onClick={() => setPaymentMethod("card")}
              type="button"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Card
            </Button>
            <Button
              variant={paymentMethod === "online" ? "default" : "outline"}
              className={`flex items-center ${paymentMethod === "online" ? "bg-purple-600 hover:bg-purple-700" : ""}`}
              onClick={() => setPaymentMethod("online")}
              type="button"
            >
              <Globe className="w-4 h-4 mr-2" />
              Online
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="discount-type">Discount</Label>
          <div className="grid grid-cols-3 gap-2">
            <Select 
              value={discountType} 
              onValueChange={(value: DiscountType) => setDiscountType(value)}
            >
              <SelectTrigger id="discount-type">
                <SelectValue placeholder="Discount Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Discount</SelectItem>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="fixed">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
            
            {discountType !== "none" && (
              <div className="col-span-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full"
                    >
                      {discountType === "percentage" ? `${discountValue}%` : formatPrice(discountValue)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium">Adjust Discount</h4>
                      <Slider
                        value={[discountValue]}
                        max={discountType === "percentage" ? 100 : subtotal}
                        step={discountType === "percentage" ? 1 : 10}
                        onValueChange={(values) => setDiscountValue(values[0])}
                      />
                      <div className="flex justify-between">
                        <span>0</span>
                        <span>{discountType === "percentage" ? "100%" : formatPrice(subtotal)}</span>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </div>

        {customerMemberships.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="membership">Apply Membership</Label>
            <Select 
              value={selectedMembershipId || ""} 
              onValueChange={(value) => setSelectedMembershipId(value || null)}
            >
              <SelectTrigger id="membership">
                <SelectValue placeholder="Select Membership" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Membership</SelectItem>
                {customerMemberships.map((membership) => (
                  <SelectItem key={membership.membership_id} value={membership.membership_id}>
                    {membership.memberships.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="coupon">Apply Coupon</Label>
          <Select 
            value={activeCouponId || ""} 
            onValueChange={(value) => applyCoupon(value)}
          >
            <SelectTrigger id="coupon">
              <SelectValue placeholder="Select Coupon" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No Coupon</SelectItem>
              {coupons.map((coupon: Coupon) => (
                <SelectItem key={coupon.id} value={coupon.id}>
                  {coupon.code} - {coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : formatPrice(coupon.discount_value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoyaltyEnabled && (
          <div className="space-y-4 border p-4 rounded-md bg-amber-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <Label className="text-sm font-medium">Loyalty Points</Label>
              </div>
              <div className="text-sm text-amber-700 font-medium">
                Balance: {customerPoints} points
              </div>
            </div>
            
            {customerPoints >= minRedemptionPoints && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="use-points" className="text-sm">
                    Use Points for this Purchase
                  </Label>
                  <Switch 
                    id="use-points" 
                    checked={usePoints}
                    onCheckedChange={setUsePoints} 
                  />
                </div>
                
                {usePoints && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Points to redeem</span>
                      <span>{pointsToRedeem} points ({formatPrice(pointsDiscountAmount)})</span>
                    </div>
                    <Slider
                      value={[pointsToRedeem]}
                      min={minRedemptionPoints}
                      max={maxPointsToRedeem}
                      step={minRedemptionPoints}
                      onValueChange={(values) => setPointsToRedeem(values[0])}
                      disabled={!usePoints}
                    />
                    <div className="flex justify-between text-xs">
                      <span>{minRedemptionPoints}</span>
                      <span>{maxPointsToRedeem}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-2 mt-2 bg-amber-100 p-2 rounded-md">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-xs">You'll earn <span className="font-bold">{pointsToEarn} points</span> from this purchase!</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Add any special notes or requests"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </div>
      
      <Separator />
      
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        
        {discountType !== "none" && discount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Discount ({discountType === "percentage" ? `${discountValue}%` : formatPrice(discountValue)})</span>
            <span>-{formatPrice(discount)}</span>
          </div>
        )}
        
        {membershipDiscount > 0 && membershipName && (
          <div className="flex justify-between text-sm text-green-600">
            <span className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {membershipName} Discount
            </span>
            <span>-{formatPrice(membershipDiscount)}</span>
          </div>
        )}
        
        {couponDiscount > 0 && couponName && (
          <div className="flex justify-between text-sm text-green-600">
            <span className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Coupon: {couponName}
            </span>
            <span>-{formatPrice(couponDiscount)}</span>
          </div>
        )}
        
        {pointsDiscountAmount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 text-amber-500" />
              Loyalty Points Discount
            </span>
            <span>-{formatPrice(pointsDiscountAmount)}</span>
          </div>
        )}
        
        {taxAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span>Tax</span>
            <span>{formatPrice(taxAmount)}</span>
          </div>
        )}
        
        <div className="flex justify-between font-bold pt-2 border-t">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
        
        {isLoyaltyEnabled && pointsToEarn > 0 && (
          <div className="flex justify-between text-xs text-amber-600 bg-amber-50 p-2 rounded">
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              Points to Earn
            </span>
            <span>+{pointsToEarn}</span>
          </div>
        )}
      </div>
      
      <div className="space-y-2 pt-4">
        {handleSaveAppointment && (
          <Button
            className="w-full"
            variant="outline"
            onClick={handleSave}
            disabled={loadingCheckout || loadingPayment}
          >
            Save Appointment
          </Button>
        )}
        
        <Button
          className="w-full h-12"
          onClick={handleCheckout}
          disabled={loadingCheckout || loadingPayment || total <= 0}
        >
          {loadingCheckout || loadingPayment ? "Processing..." : "Complete Payment"}
        </Button>
      </div>
    </div>
  );
};

export default CheckoutSection;
