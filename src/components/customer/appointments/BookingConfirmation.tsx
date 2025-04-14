
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/components/cart/CartContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ShoppingCart, MapPin, Clock, Calendar, CreditCard, Coins } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useLocationTaxSettings } from "@/hooks/use-location-tax-settings";
import { useTaxRates } from "@/hooks/use-tax-rates";
import { useCoupons } from "@/hooks/use-coupons";
import { useCustomerMemberships } from "@/hooks/use-customer-memberships";
import { useLoyaltyInCheckout } from "@/pages/admin/bookings/hooks/useLoyaltyInCheckout";

export function BookingConfirmation() {
  const {
    items,
    selectedTimeSlots,
    selectedDate,
    selectedLocation,
    clearCart,
    appliedTaxId,
    appliedCouponId,
  } = useCart();
  
  const [isLoading, setIsLoading] = useState(false);
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [totalPrice, setTotalPrice] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponName, setCouponName] = useState<string | null>(null);
  const [membershipDiscount, setMembershipDiscount] = useState(0);
  const [membershipName, setMembershipName] = useState<string | null>(null);
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [totalDuration, setTotalDuration] = useState(0);
  const [locationName, setLocationName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  
  const { taxRates } = useTaxRates();
  const { getCouponById } = useCoupons();
  const { customerMemberships, getApplicableMembershipDiscount } = useCustomerMemberships();
  
  const navigate = useNavigate();
  
  // Calculate subtotal
  const subtotal = items.reduce((total, item) => {
    return total + (item.selling_price || 0);
  }, 0);
  
  // Calculate total duration
  useEffect(() => {
    const duration = items.reduce((total, item) => {
      return total + (item.duration || 0);
    }, 0);
    setTotalDuration(duration);
  }, [items]);
  
  // Get current user and location name
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setCustomerId(session.user.id);
      } else {
        navigate("/login");
      }
    };
    
    const getLocationName = async () => {
      if (selectedLocation) {
        const { data } = await supabase
          .from("locations")
          .select("name")
          .eq("id", selectedLocation)
          .single();
        
        if (data) {
          setLocationName(data.name);
        }
      }
    };
    
    getCurrentUser();
    getLocationName();
  }, [navigate, selectedLocation]);
  
  // Loyalty integration
  const loyalty = useLoyaltyInCheckout({
    customerId,
    selectedServices: items
      .filter(item => item.type === 'service' && item.service_id)
      .map(item => item.service_id as string),
    selectedPackages: items
      .filter(item => item.type === 'package' && item.package_id)
      .map(item => item.package_id as string),
    services: items.filter(item => item.type === 'service').map(item => item.service),
    packages: items.filter(item => item.type === 'package').map(item => item.package),
    subtotal,
    discountedSubtotal: subtotal - membershipDiscount - couponDiscount
  });
  
  // Calculate membership discount
  useEffect(() => {
    if (!items || items.length === 0 || customerMemberships.length === 0) {
      setMembershipDiscount(0);
      setMembershipName(null);
      setMembershipId(null);
      return;
    }
    
    let totalMembershipDiscount = 0;
    let bestMembership = null;
    
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
    setMembershipName(bestMembership ? bestMembership.name : null);
    setMembershipId(bestMembership ? bestMembership.id : null);
    
  }, [items, customerMemberships, getApplicableMembershipDiscount]);
  
  // Get coupon discount
  useEffect(() => {
    const getCouponDiscount = async () => {
      if (!appliedCouponId) {
        setCouponDiscount(0);
        setCouponName(null);
        return;
      }
      
      try {
        const coupon = await getCouponById(appliedCouponId);
        if (coupon) {
          setCouponName(coupon.code);
          const discountableAmount = subtotal - membershipDiscount;
          const discount = coupon.discount_type === 'percentage' 
            ? discountableAmount * (coupon.discount_value / 100)
            : Math.min(coupon.discount_value, discountableAmount);
          
          setCouponDiscount(discount);
        }
      } catch (error) {
        console.error("Error fetching coupon:", error);
      }
    };
    
    getCouponDiscount();
  }, [appliedCouponId, subtotal, membershipDiscount, getCouponById]);
  
  // Get tax amount
  useEffect(() => {
    if (appliedTaxId && taxRates.length > 0) {
      const taxRate = taxRates.find(tax => tax.id === appliedTaxId);
      if (taxRate) {
        // Apply tax after all discounts including loyalty points
        const afterCouponSubtotal = subtotal - membershipDiscount - couponDiscount;
        const afterLoyaltyDiscount = afterCouponSubtotal - loyalty.pointsDiscountAmount;
        setTaxAmount(afterLoyaltyDiscount * (taxRate.percentage / 100));
      }
    } else {
      setTaxAmount(0);
    }
  }, [appliedTaxId, subtotal, membershipDiscount, couponDiscount, taxRates, loyalty.pointsDiscountAmount]);
  
  // Calculate total price
  useEffect(() => {
    const afterMembershipDiscount = subtotal - membershipDiscount;
    const afterCouponDiscount = afterMembershipDiscount - couponDiscount;
    const afterLoyaltyDiscount = afterCouponDiscount - loyalty.pointsDiscountAmount;
    const total = afterLoyaltyDiscount + taxAmount;
    setTotalPrice(total);
  }, [subtotal, membershipDiscount, couponDiscount, taxAmount, loyalty.pointsDiscountAmount]);
  
  const handleBookingConfirmation = async () => {
    try {
      setIsLoading(true);
      
      if (!customerId) {
        toast.error("Please log in to book an appointment");
        navigate("/login");
        return;
      }
      
      if (!selectedDate) {
        toast.error("Please select a date for your appointment");
        return;
      }
      
      // Create appointment
      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          customer_id: customerId,
          start_time: new Date(selectedDate),
          end_time: new Date(selectedDate),
          status: "pending",
          total_price: totalPrice,
          tax_amount: taxAmount,
          tax_id: appliedTaxId,
          discount_type: couponDiscount > 0 ? "coupon" : membershipDiscount > 0 ? "membership" : "none",
          discount_value: couponDiscount > 0 ? couponDiscount : membershipDiscount,
          coupon_id: appliedCouponId || null,
          coupon_name: couponName,
          coupon_amount: couponDiscount,
          membership_discount: membershipDiscount,
          membership_id: membershipId,
          membership_name: membershipName,
          location: selectedLocation,
          payment_method: paymentMethod,
          // Store loyalty points information without updating wallet balance
          points_earned: loyalty.pointsToEarn, // For display only
          points_redeemed: loyalty.pointsToRedeem,
          points_discount_amount: loyalty.pointsDiscountAmount
        })
        .select()
        .single();
      
      if (appointmentError) {
        throw appointmentError;
      }
      
      // Create bookings for each item
      const bookingsToCreate = items.map(item => {
        const timeSlot = selectedTimeSlots[item.id];
        const [hours, minutes] = timeSlot.split(":").map(Number);
        
        const startTime = new Date(selectedDate);
        startTime.setHours(hours, minutes, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + (item.duration || 0));
        
        return {
          appointment_id: appointmentData.id,
          service_id: item.service_id || null,
          package_id: item.package_id || null,
          price_paid: item.selling_price || 0,
          status: "pending",
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          employee_id: item.employee_id || null
        };
      });
      
      const { error: bookingsError } = await supabase
        .from("bookings")
        .insert(bookingsToCreate);
      
      if (bookingsError) {
        throw bookingsError;
      }
      
      // Clear cart and navigate to success page
      await clearCart();
      
      navigate(`/booking-success/${appointmentData.id}`);
      
    } catch (error: any) {
      console.error("Booking error:", error);
      toast.error(error.message || "Failed to book appointment");
    } finally {
      setIsLoading(false);
    }
  };
  
  if (items.length === 0) {
    navigate("/services");
    return null;
  }
  
  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-2xl font-bold mb-6">Booking Confirmation</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">Appointment Details</h2>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <Calendar className="h-5 w-5 text-primary mr-2 mt-0.5" />
                <div>
                  <h3 className="font-medium">Date</h3>
                  <p className="text-sm">
                    {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Not selected"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-primary mr-2 mt-0.5" />
                <div>
                  <h3 className="font-medium">Location</h3>
                  <p className="text-sm">{locationName || "Not selected"}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Clock className="h-5 w-5 text-primary mr-2 mt-0.5" />
                <div>
                  <h3 className="font-medium">Duration</h3>
                  <p className="text-sm">{totalDuration} minutes</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-2">Services</h3>
                <div className="space-y-3">
                  {items.map((item) => {
                    const timeSlot = selectedTimeSlots[item.id];
                    const displayPrice = loyalty.adjustedServicePrices[item.service_id as string] !== undefined 
                      ? loyalty.adjustedServicePrices[item.service_id as string]
                      : item.selling_price;
                    
                    return (
                      <div
                        key={item.id}
                        className="flex justify-between text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {item.name || item.service?.name || item.package?.name}
                          </p>
                          <p className="text-muted-foreground">
                            {timeSlot ? `${timeSlot}` : "Time not selected"}
                          </p>
                        </div>
                        <div className="text-right">
                          {displayPrice !== item.selling_price ? (
                            <>
                              <p className="line-through text-muted-foreground">
                                {formatPrice(item.selling_price || 0)}
                              </p>
                              <p className="text-green-600">
                                {formatPrice(displayPrice || 0)}
                              </p>
                            </>
                          ) : (
                            <p>{formatPrice(item.selling_price || 0)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
            <div className="space-y-3">
              <div 
                className={`flex items-center p-3 rounded-md border cursor-pointer ${
                  paymentMethod === "cash" ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => setPaymentMethod("cash")}
              >
                <CreditCard className="h-5 w-5 mr-2" />
                <span>Pay at Salon</span>
              </div>
            </div>
          </Card>
        </div>
        
        <div>
          <Card className="p-4 sticky top-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <ShoppingCart className="h-5 w-5" />
              <span>Order Summary</span>
            </h2>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              
              {membershipDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Membership Discount</span>
                  <span>-{formatPrice(membershipDiscount)}</span>
                </div>
              )}
              
              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Coupon Discount</span>
                  <span>-{formatPrice(couponDiscount)}</span>
                </div>
              )}
              
              {/* Loyalty Points Section */}
              {loyalty.isLoyaltyEnabled && (
                <div className="space-y-1 pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Coins className="h-4 w-4" /> Loyalty Points
                    </span>
                  </div>
                  
                  {/* Current wallet balance display */}
                  <div className="flex justify-between text-sm">
                    <span>Available Points</span>
                    <span>{loyalty.walletBalance}</span>
                  </div>
                  
                  {loyalty.pointsToRedeem > 0 && (
                    <>
                      {/* Points redemption (automatic) */}
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Points Redeemed</span>
                        <span>-{loyalty.pointsToRedeem}</span>
                      </div>
                      
                      {/* Points discount amount */}
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Points Discount</span>
                        <span>-{formatPrice(loyalty.pointsDiscountAmount)}</span>
                      </div>
                    </>
                  )}
                  
                  {/* Points to earn (display only) */}
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Points You'll Earn</span>
                    <span>+{loyalty.pointsToEarn}</span>
                  </div>
                </div>
              )}
              
              {taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatPrice(taxAmount)}</span>
                </div>
              )}
              
              <Separator className="my-2" />
              
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
            </div>
            
            <Button
              className="w-full mt-4"
              size="lg"
              onClick={handleBookingConfirmation}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Confirm Booking"}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
