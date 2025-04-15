import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCart } from "@/components/cart/CartContext";
import { CartSummary } from "@/components/cart/CartSummary";
import { format, addMinutes } from "date-fns";
import { formatPrice } from "@/lib/utils";
import { useCoupons } from "@/hooks/use-coupons";
import { useTaxRates } from "@/hooks/use-tax-rates";
import { useLocationTaxSettings } from "@/hooks/use-location-tax-settings";
import { supabase } from "@/integrations/supabase/client";
import { Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLoyaltyPoints } from "@/hooks/use-loyalty-points";
import { toast } from "sonner";

export default function BookingConfirmation() {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [customerPoints, setCustomerPoints] = useState<{
    walletBalance: number;
    lastUsed: Date | null;
  } | null>(null);
  const [loyaltySettings, setLoyaltySettings] = useState<any>(null);
  const [pointsToEarn, setPointsToEarn] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [pointsDiscountAmount, setPointsDiscountAmount] = useState(0);
  const [isLoyaltyEnabled, setIsLoyaltyEnabled] = useState(false);
  const [adjustedServicePrices, setAdjustedServicePrices] = useState<Record<string, number>>({});

  const navigate = useNavigate();
  const {
    items,
    selectedDate,
    selectedTimeSlots,
    selectedLocation,
    appliedTaxId,
    appliedCouponId,
    resetCart,
    getTotalPrice,
  } = useCart();

  const { taxRates, fetchTaxRates, isLoading: taxRatesLoading } = useTaxRates();
  const { fetchLocationTaxSettings } = useLocationTaxSettings();
  const { coupons, fetchCoupons, getCouponById } = useCoupons();
  const {
    settings,
    customerPoints: loyaltyCustomerPoints,
    isLoading: loyaltyLoading,
    calculatePointsFromAmount,
    calculateAmountFromPoints,
    hasMinimumForRedemption,
    getMaxRedeemablePoints,
    isEligibleForPoints,
    getEligibleAmount,
  } = useLoyaltyPoints(userId);

  const [taxAmount, setTaxAmount] = useState(0);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);

  const subtotal = getTotalPrice();

  // Initialize user data and fetch loyalty points
  useEffect(() => {
    async function initializeUserData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          setUserId(session.user.id);
        }
      } catch (error) {
        console.error("Error getting session:", error);
      }
    }

    initializeUserData();
  }, []);

  // Fetch tax and coupon data
  useEffect(() => {
    fetchTaxRates();
    fetchCoupons();

    if (selectedLocation && appliedTaxId) {
      const loadTaxData = async () => {
        const settings = await fetchLocationTaxSettings(selectedLocation);
        if (settings && settings.service_tax_id) {
          // Tax is already applied through cart context
        }
      };
      loadTaxData();
    }
  }, [fetchTaxRates, fetchCoupons, selectedLocation, appliedTaxId, fetchLocationTaxSettings]);

  // Calculate tax amount
  useEffect(() => {
    if (appliedTaxId && taxRates.length > 0) {
      const taxRate = taxRates.find(tax => tax.id === appliedTaxId);
      if (taxRate) {
        // Apply tax after all discounts including loyalty points
        const finalSubtotal = subtotal - couponDiscount - pointsDiscountAmount;
        setTaxAmount(finalSubtotal * (taxRate.percentage / 100));
      }
    } else {
      setTaxAmount(0);
    }
  }, [appliedTaxId, subtotal, couponDiscount, pointsDiscountAmount, taxRates]);

  // Fetch coupon details
  useEffect(() => {
    if (appliedCouponId) {
      const fetchCouponDetails = async () => {
        // First check in already loaded coupons
        const existingCoupon = coupons.find(c => c.id === appliedCouponId);
        if (existingCoupon) {
          setSelectedCoupon(existingCoupon);
          calculateCouponDiscount(existingCoupon);
          return;
        }

        // If not found, fetch it directly
        try {
          const coupon = await getCouponById(appliedCouponId);
          if (coupon) {
            setSelectedCoupon(coupon);
            calculateCouponDiscount(coupon);
          }
        } catch (error) {
          console.error("Error fetching coupon:", error);
        }
      };

      fetchCouponDetails();
    } else {
      setSelectedCoupon(null);
      setCouponDiscount(0);
    }
  }, [appliedCouponId, coupons, getCouponById]);

  const calculateCouponDiscount = (coupon: any) => {
    if (!coupon) return;

    // Apply coupon to subtotal
    const discount = coupon.discount_type === 'percentage'
      ? subtotal * (coupon.discount_value / 100)
      : Math.min(coupon.discount_value, subtotal);

    setCouponDiscount(discount);
  };

  // Process loyalty points logic when customer points are loaded
  useEffect(() => {
    setLoyaltySettings(settings);
    setCustomerPoints(loyaltyCustomerPoints);
    setIsLoyaltyEnabled(!!settings?.enabled);

    if (settings?.enabled && userId) {
      // Calculate eligible amount for points earning
      const serviceIds = items
        .filter(item => item.type === 'service' && item.service_id)
        .map(item => item.service_id);
      
      const packageIds = items
        .filter(item => item.type === 'package' && item.package_id)
        .map(item => item.package_id);

      // Map cart items to service/package objects for loyalty calculations
      const servicesData = items
        .filter(item => item.type === 'service')
        .map(item => ({
          id: item.service_id || '',
          selling_price: item.selling_price || item.service?.selling_price || 0
        }));
      
      const packagesData = items
        .filter(item => item.type === 'package')
        .map(item => ({
          id: item.package_id || '',
          price: item.selling_price || item.package?.price || 0
        }));

      // Calculate eligible amount for points earning
      const eligibleAmount = getEligibleAmount(
        serviceIds,
        packageIds,
        servicesData,
        packagesData,
        subtotal
      );

      // Calculate points to earn
      const pointsEarned = calculatePointsFromAmount(eligibleAmount);
      setPointsToEarn(pointsEarned);

      // Calculate max redeemable points based on settings
      if (loyaltyCustomerPoints && hasMinimumForRedemption(loyaltyCustomerPoints)) {
        const maxPoints = getMaxRedeemablePoints(subtotal);
        setPointsToRedeem(maxPoints);
        
        // Calculate discount amount from redeemed points
        if (maxPoints > 0) {
          const discount = calculateAmountFromPoints(maxPoints);
          setPointsDiscountAmount(discount);
          
          // Calculate adjusted service prices with loyalty discount
          calculateAdjustedPrices(discount);
        }
      }
    }
  }, [
    settings, 
    loyaltyCustomerPoints, 
    items, 
    subtotal, 
    userId, 
    calculatePointsFromAmount, 
    calculateAmountFromPoints, 
    hasMinimumForRedemption, 
    getMaxRedeemablePoints,
    getEligibleAmount
  ]);

  // Calculate adjusted prices for each service based on loyalty discount
  const calculateAdjustedPrices = (discountAmount: number) => {
    if (discountAmount <= 0 || subtotal <= 0) {
      setAdjustedServicePrices({});
      return;
    }

    const discountRatio = discountAmount / subtotal;
    const newAdjustedPrices: Record<string, number> = {};
    
    // Apply discount to individual services proportionally
    items.forEach((item) => {
      if (item.type === 'service' && item.service_id) {
        const originalPrice = item.selling_price || item.service?.selling_price || 0;
        const itemDiscount = originalPrice * discountRatio;
        newAdjustedPrices[item.service_id] = originalPrice - itemDiscount;
      } else if (item.type === 'package' && item.package_id) {
        const packagePrice = item.selling_price || item.package?.price || 0;
        const packageDiscount = packagePrice * discountRatio;
        
        if (item.package?.package_services) {
          item.package.package_services.forEach((ps) => {
            const serviceId = ps.service.id;
            const servicePrice = ps.package_selling_price !== undefined ? 
              ps.package_selling_price : ps.service.selling_price;
            
            // Calculate service's proportion of package price
            const proportion = servicePrice / packagePrice;
            const serviceDiscountAmount = packageDiscount * proportion;
            
            newAdjustedPrices[serviceId] = servicePrice - serviceDiscountAmount;
          });
        }
      }
    });
    
    setAdjustedServicePrices(newAdjustedPrices);
  };

  // Calculate final price after all discounts and tax
  const finalPrice = subtotal - couponDiscount - pointsDiscountAmount + taxAmount;

  // Get the displayed price for an item (either original or adjusted with loyalty discount)
  const getItemPrice = (item: any) => {
    if (!item) return 0;
    
    // First check if there's a loyalty-adjusted price for this item
    if (item.service_id && adjustedServicePrices[item.service_id]) {
      return adjustedServicePrices[item.service_id];
    }
    
    // Otherwise return the regular price
    return item.selling_price || item.service?.selling_price || item.package?.price || 0;
  };

  const handleBookNow = async () => {
    if (!selectedDate || Object.keys(selectedTimeSlots).length === 0) {
      toast.error("Please select a date and time");
      return;
    }

    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in to book");
        navigate("/auth");
        return;
      }

      const userId = session.user.id;

      // Create appointment
      const appointmentData = {
        customer_id: userId,
        start_time: new Date(`${format(selectedDate, "yyyy-MM-dd")} ${
          Object.values(selectedTimeSlots)[0]
        }`),
        end_time: addMinutes(
          new Date(`${format(selectedDate, "yyyy-MM-dd")} ${
            Object.values(selectedTimeSlots)[0]
          }`),
          items.reduce(
            (acc, item) =>
              acc +
              (item.duration ||
                item.service?.duration ||
                item.package?.duration ||
                0),
            0
          )
        ),
        total_price: finalPrice,
        status: "pending",
        location: selectedLocation,
        payment_method: "online",
        tax_id: appliedTaxId,
        tax_amount: taxAmount,
        coupon_id: appliedCouponId,
        coupon_amount: couponDiscount,
        coupon_name: selectedCoupon?.code,
        points_earned: pointsToEarn,
        points_redeemed: pointsToRedeem,
        points_discount_amount: pointsDiscountAmount
      };

      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert([appointmentData])
        .select()
        .single();

      if (appointmentError) {
        throw new Error(`Error creating appointment: ${appointmentError.message}`);
      }

      // Create bookings for each item
      for (const item of items) {
        const bookingData = {
          appointment_id: appointment.id,
          service_id: item.type === "service" ? item.service_id : null,
          package_id: item.type === "package" ? item.package_id : null,
          start_time: new Date(`${format(selectedDate, "yyyy-MM-dd")} ${
            selectedTimeSlots[item.id]
          }`),
          end_time: addMinutes(
            new Date(
              `${format(selectedDate, "yyyy-MM-dd")} ${selectedTimeSlots[item.id]}`
            ),
            item.duration || item.service?.duration || item.package?.duration || 0
          ),
          price_paid: getItemPrice(item)
        };

        const { error: bookingError } = await supabase
          .from("bookings")
          .insert([bookingData]);

        if (bookingError) {
          throw new Error(`Error creating booking: ${bookingError.message}`);
        }
      }

      // If loyalty is enabled and points are redeemed, update user's wallet balance
      if (isLoyaltyEnabled && pointsToRedeem > 0) {
        const newBalance = (loyaltyCustomerPoints?.walletBalance || 0) - pointsToRedeem;
        
        const { error: pointsError } = await supabase
          .from("profiles")
          .update({ 
            wallet_balance: newBalance,
            last_used: new Date().toISOString()
          })
          .eq("id", userId);
          
        if (pointsError) {
          console.error("Error updating points balance:", pointsError);
        }
      }

      // Add points earned to customer wallet
      if (isLoyaltyEnabled && pointsToEarn > 0) {
        const currentBalance = loyaltyCustomerPoints?.walletBalance || 0;
        const newBalance = currentBalance + pointsToEarn;
        
        const { error: pointsError } = await supabase
          .from("profiles")
          .update({ wallet_balance: newBalance })
          .eq("id", userId);
          
        if (pointsError) {
          console.error("Error updating points earned:", pointsError);
        }
      }

      toast.success("Booking successful!");
      resetCart();
      navigate("/");
    } catch (error: any) {
      console.error("Error booking:", error);
      toast.error(error.message || "Error booking");
    } finally {
      setLoading(false);
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    const aTime = selectedTimeSlots[a.id] || "00:00";
    const bTime = selectedTimeSlots[b.id] || "00:00";
    return aTime.localeCompare(bTime);
  });

  return (
    <div className="container mx-auto py-8 px-4 md:py-12">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-6">Confirm your booking</h1>
          
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Your Appointment Details</h2>
            {selectedDate && (
              <div className="p-4 bg-muted rounded-lg mb-4">
                <p className="font-medium">
                  {format(selectedDate, "EEEE, MMMM d, yyyy")}
                </p>
                {items.length > 0 && Object.keys(selectedTimeSlots).length > 0 && (
                  <p className="text-muted-foreground">
                    Starting at {Object.values(selectedTimeSlots)[0]}
                  </p>
                )}
              </div>
            )}

            {selectedLocation && (
              <div className="p-4 bg-muted rounded-lg mb-4">
                <p className="font-medium">Location</p>
                <p className="text-muted-foreground">{selectedLocation}</p>
              </div>
            )}
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Selected Services</h2>
            <ScrollArea className="h-[400px] rounded-lg border">
              <div className="p-4 space-y-4">
                {sortedItems.map((item) => {
                  const itemDuration = item.duration || item.service?.duration || item.package?.duration || 0;
                  const originalPrice = item.selling_price || item.service?.selling_price || item.package?.price || 0;
                  const discountedPrice = getItemPrice(item);
                  const isDiscounted = discountedPrice < originalPrice;
                  
                  return (
                    <div
                      key={item.id}
                      className="flex items-start justify-between border-b pb-4"
                    >
                      <div>
                        <h3 className="font-medium">
                          {item.name || item.service?.name || item.package?.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Duration: {itemDuration} min
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(selectedDate, "MMM d")} at{" "}
                          {selectedTimeSlots[item.id]} -{" "}
                          {format(
                            addMinutes(
                              new Date(
                                `${format(selectedDate, "yyyy-MM-dd")} ${
                                  selectedTimeSlots[item.id]
                                }`
                              ),
                              itemDuration
                            ),
                            "HH:mm"
                          )}
                        </p>
                      </div>
                      <div>
                        {isDiscounted ? (
                          <div className="flex flex-col items-end">
                            <span className="text-sm line-through text-muted-foreground">
                              {formatPrice(originalPrice)}
                            </span>
                            <span className="text-sm font-medium text-green-600">
                              {formatPrice(discountedPrice)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm font-medium">
                            {formatPrice(originalPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Price Summary */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Payment Summary</h2>
            <div className="space-y-2 bg-muted p-4 rounded-lg">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              
              {couponDiscount > 0 && selectedCoupon && (
                <div className="flex justify-between text-green-600">
                  <span>
                    Coupon ({selectedCoupon.code})
                  </span>
                  <span>-{formatPrice(couponDiscount)}</span>
                </div>
              )}
              
              {isLoyaltyEnabled && pointsToRedeem > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1">
                    <Award className="h-4 w-4" />
                    Loyalty Points ({pointsToRedeem} points)
                  </span>
                  <span>-{formatPrice(pointsDiscountAmount)}</span>
                </div>
              )}
              
              {taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatPrice(taxAmount)}</span>
                </div>
              )}
              
              <div className="flex justify-between pt-2 border-t text-lg font-semibold">
                <span>Total</span>
                <span>{formatPrice(finalPrice)}</span>
              </div>
              
              {isLoyaltyEnabled && (
                <div className="pt-2 border-t mt-2">
                  <div className="flex justify-between text-sm items-center">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Award className="h-4 w-4" />
                      Current Points Balance
                    </span>
                    <Badge variant="outline">
                      {loyaltyCustomerPoints?.walletBalance || 0} points
                    </Badge>
                  </div>
                  {pointsToEarn > 0 && (
                    <div className="flex justify-between text-sm items-center mt-1">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Award className="h-4 w-4" />
                        Points to Earn
                      </span>
                      <Badge variant="secondary" className="text-green-600">
                        +{pointsToEarn} points
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <Button 
            className="w-full" 
            size="lg" 
            onClick={handleBookNow}
            disabled={loading}
          >
            {loading ? "Processing..." : "Confirm Booking"}
          </Button>
        </div>

        <div className="w-full lg:w-1/3 h-auto">
          <CartSummary />
        </div>
      </div>
    </div>
  );
}
