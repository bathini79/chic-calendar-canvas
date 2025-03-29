
import { useCart } from "./CartContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useNavigate, useLocation } from "react-router-dom";
import { format, addMinutes } from "date-fns";
import { formatPrice } from "@/lib/utils";
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocationTaxSettings } from "@/hooks/use-location-tax-settings";
import { useTaxRates } from "@/hooks/use-tax-rates";
import { useCoupons, Coupon } from "@/hooks/use-coupons";
import { useCustomerMemberships } from "@/hooks/use-customer-memberships";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Award } from "lucide-react";

export function CartSummary() {
  const { 
    items, 
    removeFromCart, 
    selectedDate, 
    selectedTimeSlots,
    getTotalPrice,
    getTotalDuration,
    selectedLocation,
    appliedTaxId,
    setAppliedTaxId,
    appliedCouponId,
    setAppliedCouponId
  } = useCart();
  
  const [taxAmount, setTaxAmount] = useState(0);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [membershipDiscount, setMembershipDiscount] = useState(0);
  const [activeMembership, setActiveMembership] = useState<any>(null);
  const { fetchLocationTaxSettings } = useLocationTaxSettings();
  const { taxRates, fetchTaxRates } = useTaxRates();
  const { coupons, fetchCoupons, isLoading: couponsLoading, getCouponById } = useCoupons();
  const { customerMemberships, fetchCustomerMemberships, getApplicableMembershipDiscount } = useCustomerMemberships();
  
  const navigate = useNavigate();
  const location = useLocation();
  const isSchedulingPage = location.pathname === '/schedule';
  const isServicesPage = location.pathname === '/services';
  const isBookingConfirmation = location.pathname === '/booking-confirmation';
  
  // Only show tax and coupons on booking-confirmation or other pages, not on services or schedule
  const shouldShowTaxAndCoupon = !isServicesPage && !isSchedulingPage;

  const subtotal = getTotalPrice();
  const totalDuration = getTotalDuration();
  const afterMembershipDiscount = subtotal - membershipDiscount;
  const afterCouponSubtotal = afterMembershipDiscount - couponDiscount;
  const totalPrice = afterCouponSubtotal + taxAmount;
  const isTimeSelected = Object.keys(selectedTimeSlots).length > 0;
  
  // Refs to prevent infinite loops
  const taxLoadedRef = useRef(false);
  const locationSettingsLoadedRef = useRef(false);
  const membershipFetchedRef = useRef(false);
  const couponsFetchedRef = useRef(false);
  
  // Fetch customer memberships when the component loads (if we're not in booking confirmation)
  const fetchMemberships = useCallback(async () => {
    if (isBookingConfirmation || membershipFetchedRef.current) return;
    
    try {
      membershipFetchedRef.current = true;
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetchCustomerMemberships(session.user.id);
      }
    } catch (error) {
      console.error("Error fetching memberships:", error);
    }
  }, [fetchCustomerMemberships, isBookingConfirmation]);

  useEffect(() => {
    fetchMemberships();
  }, [fetchMemberships]);

  // Calculate membership discounts for cart items with protection against infinite loops
  useEffect(() => {
    // Skip recalculation if data isn't available yet
    if (!items || items.length === 0 || customerMemberships.length === 0) {
      setMembershipDiscount(0);
      setActiveMembership(null);
      return;
    }
    
    let totalMembershipDiscount = 0;
    let bestMembership = null;
    
    // Process each cart item to find applicable membership discounts
    items.forEach(item => {
      if (item.type === 'service' && item.service_id) {
        const servicePrice = item.selling_price || item.service?.selling_price || 0;
        const discountInfo = getApplicableMembershipDiscount(item.service_id, null, servicePrice);
        
        if (discountInfo && discountInfo.calculatedDiscount > 0) {
          totalMembershipDiscount += discountInfo.calculatedDiscount;
          if (!bestMembership || discountInfo.calculatedDiscount > (bestMembership.discount || 0)) {
            bestMembership = {
              id: discountInfo.membershipId,
              name: discountInfo.membershipName,
              discount: discountInfo.calculatedDiscount
            };
          }
        }
      } else if (item.type === 'package' && item.package_id) {
        const packagePrice = item.selling_price || item.package?.price || 0;
        const discountInfo = getApplicableMembershipDiscount(null, item.package_id, packagePrice);
        
        if (discountInfo && discountInfo.calculatedDiscount > 0) {
          totalMembershipDiscount += discountInfo.calculatedDiscount;
          if (!bestMembership || discountInfo.calculatedDiscount > (bestMembership.discount || 0)) {
            bestMembership = {
              id: discountInfo.membershipId,
              name: discountInfo.membershipName,
              discount: discountInfo.calculatedDiscount
            };
          }
        }
      }
    });
        setMembershipDiscount(totalMembershipDiscount);
    setActiveMembership(bestMembership);
    
  }, [items, customerMemberships, getApplicableMembershipDiscount]);
  
  // Load tax data
  useEffect(() => {
    const loadTaxData = async () => {
      if (taxLoadedRef.current) return;
      
      taxLoadedRef.current = true;
      await fetchTaxRates();
      
      if (selectedLocation && !appliedTaxId && !locationSettingsLoadedRef.current) {
        locationSettingsLoadedRef.current = true;
        const settings = await fetchLocationTaxSettings(selectedLocation);
        
        if (settings && settings.service_tax_id) {
          setAppliedTaxId(settings.service_tax_id);
        }
      }
    };
    
    loadTaxData();
  }, [selectedLocation, appliedTaxId, fetchTaxRates, fetchLocationTaxSettings, setAppliedTaxId]);

  // Load coupons
  useEffect(() => {
    if (couponsFetchedRef.current) return;
      couponsFetchedRef.current = true;
    fetchCoupons();
  }, [fetchCoupons]);

  // Calculate tax amount whenever appliedTaxId or subtotal changes
  useEffect(() => {
    if (appliedTaxId && taxRates.length > 0) {
      const taxRate = taxRates.find(tax => tax.id === appliedTaxId);
      if (taxRate) {
        setTaxAmount(afterCouponSubtotal * (taxRate.percentage / 100));
      }
    } else {
      setTaxAmount(0);
    }
  }, [appliedTaxId, afterCouponSubtotal, taxRates]);
  
  // Calculate coupon discount
  useEffect(() => {
    const applyCoupon = async () => {
      if (!appliedCouponId) {
        setCouponDiscount(0);
        return;
      }
            
      // First try from cache
      const cachedCoupon = coupons.find(c => c.id === appliedCouponId);
      if (cachedCoupon) {
        calculateDiscount(cachedCoupon);
        return;
      }
      
      // If not in cache, try direct lookup
      try {
        const coupon = await getCouponById(appliedCouponId);
        if (coupon) {
          calculateDiscount(coupon);
        } else {
          setCouponDiscount(0);
        }
      } catch (error) {
        console.error("Error fetching coupon:", error);
        setCouponDiscount(0);
      }
    };
    
    const calculateDiscount = (coupon: Coupon) => {
      const discountableAmount = subtotal - membershipDiscount;
      const discount = coupon.discount_type === 'percentage' 
        ? discountableAmount * (coupon.discount_value / 100)
        : Math.min(coupon.discount_value, discountableAmount); // Don't discount more than the subtotal
            setCouponDiscount(discount);
    };
    
    applyCoupon();
  }, [appliedCouponId, subtotal, coupons, getCouponById, membershipDiscount]);
  
  // Sort items by their scheduled start time
  const sortedItems = [...items].sort((a, b) => {
    const aTime = selectedTimeSlots[a.id] || "00:00";
    const bTime = selectedTimeSlots[b.id] || "00:00";
    return aTime.localeCompare(bTime);
  });

  const handleContinue = () => {
    if (isSchedulingPage) {
      if (selectedDate && isTimeSelected) {
        navigate('/booking-confirmation');
      }
    } else {
      navigate('/schedule');
    }
  };

  const handleTaxChange = (taxId: string) => {
    if (taxId === "none") {
      setAppliedTaxId(null);
    } else {
      setAppliedTaxId(taxId);
    }
  };

  const handleCouponChange = (couponId: string) => {
    if (couponId === "none") {
      setAppliedCouponId(null);
    } else {
      setAppliedCouponId(couponId);
    }
  };

  const getSelectedCoupon = () => {
    return coupons.find(c => c.id === appliedCouponId);
  };

  const selectedCoupon = getSelectedCoupon();

  // Reset reference flags when location changes
  useEffect(() => {
    if (selectedLocation) {
      locationSettingsLoadedRef.current = false;
    }
  }, [selectedLocation]);

  return (
    <Card className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Your Cart ({items.length} items)</h2>
        <p className="text-2xl font-bold mt-2">{formatPrice(shouldShowTaxAndCoupon ? totalPrice : subtotal)}</p>
        {totalDuration > 0 && (
          <p className="text-sm text-muted-foreground">Total duration: {totalDuration} min</p>
        )}
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {items.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Your cart is empty
            </p>
          ) : (
            sortedItems.map((item) => {
              const itemDuration = item.duration || item.service?.duration || item.package?.duration || 0;
              const itemPrice = item.selling_price || item.service?.selling_price || item.package?.price || item.price || 0;
              
              return (
                <div
                  key={item.id}
                  className="flex flex-col space-y-2 p-4 border rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">
                        {item.name || item.service?.name || item.package?.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Duration: {itemDuration} min
                      </p>
                      <p className="text-sm font-medium">
                        {formatPrice(itemPrice)}
                      </p>
                      {isSchedulingPage && selectedTimeSlots[item.id] && selectedDate && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {format(selectedDate, "MMM d")} at {selectedTimeSlots[item.id]} - 
                          {format(
                            addMinutes(
                              new Date(`${format(selectedDate, 'yyyy-MM-dd')} ${selectedTimeSlots[item.id]}`),
                              itemDuration
                            ),
                            "HH:mm"
                          )}
                        </p>
                      )}
                    </div>
                    {!isSchedulingPage && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeFromCart(item.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t">
        <div className="space-y-2 mb-4">
          {shouldShowTaxAndCoupon && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              
              {activeMembership && membershipDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="flex items-center gap-1">
                    <Award className="h-4 w-4" />
                    Membership ({activeMembership.name})
                  </span>
                  <span>-{formatPrice(membershipDiscount)}</span>
                </div>
              )}
              
              {/* Coupon selection */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground">Coupon</span>
                  <Select value={appliedCouponId || "none"} onValueChange={handleCouponChange} disabled={couponsLoading}>
                    <SelectTrigger className="h-8 w-[150px]">
                      <SelectValue placeholder="No Coupon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Coupon</SelectItem>
                      {coupons.map(coupon => (
                        <SelectItem key={coupon.id} value={coupon.id}>
                          {coupon.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedCoupon && (
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline" className="w-fit">
                      <span className="text-xs font-medium">
                        {selectedCoupon.discount_type === 'percentage' 
                          ? `${selectedCoupon.discount_value}% off` 
                          : `${formatPrice(selectedCoupon.discount_value)} off`}
                      </span>
                    </Badge>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-{formatPrice(couponDiscount)}</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Tax selection */}
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Tax</span>
                <Select value={appliedTaxId || "none"} onValueChange={handleTaxChange}>
                  <SelectTrigger className="h-8 w-[150px]">
                    <SelectValue placeholder="No Tax" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Tax</SelectItem>
                    {taxRates.map(tax => (
                      <SelectItem key={tax.id} value={tax.id}>
                        {tax.name} ({tax.percentage}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {appliedTaxId && taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Tax Amount
                  </span>
                  <span>{formatPrice(taxAmount)}</span>
                </div>
              )}
            </>
          )}
          
          <div className="flex justify-between text-base font-medium pt-1">
            <span>Total</span>
            <span>{formatPrice(shouldShowTaxAndCoupon ? totalPrice : subtotal)}</span>
          </div>
        </div>
        
        <Button 
          className="w-full" 
          onClick={handleContinue}
          disabled={items.length === 0 || (isSchedulingPage && 
            (!selectedDate || !isTimeSelected))}
        >
          {isSchedulingPage ? 'Continue to Booking' : 'Continue to Schedule'}
        </Button>
      </div>
    </Card>
  );
}
