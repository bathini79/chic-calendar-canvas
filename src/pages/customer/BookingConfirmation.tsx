
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  User,
  Award,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { formatPrice } from "@/lib/utils";
import { CustomerNavbar } from "@/components/customer/CustomerNavbar";
import { CartSummary } from "@/components/cart/CartSummary";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Form, FormField, FormItem, FormControl } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useLoyaltyPoints } from "@/hooks/use-loyalty-points";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

const BookingConfirmationSchema = z.object({
  terms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms and conditions" }),
  }),
});

export default function BookingConfirmation() {
  const [user, setUser] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [discountedSubtotal, setDiscountedSubtotal] = useState(0);
  const [location, setLocation] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedStylist, setSelectedStylist] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [showLoyaltySection, setShowLoyaltySection] = useState(false);
  const [usePoints, setUsePoints] = useState(true);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [maxPointsToRedeem, setMaxPointsToRedeem] = useState(0);
  const [pointsDiscountAmount, setPointsDiscountAmount] = useState(0);
  const [adjustedServicePrices, setAdjustedServicePrices] = useState<Record<string, number>>({});

  const navigate = useNavigate();

  const form = useForm({
    resolver: zodResolver(BookingConfirmationSchema),
    defaultValues: {
      terms: false,
    },
  });

  const {
    settings,
    customerPoints,
    calculatePointsFromAmount,
    calculateAmountFromPoints,
    walletBalance,
    getMaxRedeemablePoints,
  } = useLoyaltyPoints(user?.id);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setUser(profile);
      } else {
        navigate("/");
      }
    };

    fetchCurrentUser();
  }, [navigate]);

  useEffect(() => {
    const fetchCartItems = async () => {
      if (!user) return;

      setLoading(true);
      
      try {
        const { data: cartData, error: cartError } = await supabase
          .from("cart_items")
          .select("*, service:service_id(*), package:package_id(*)")
          .eq("customer_id", user.id)
          .eq("status", "pending");

        if (cartError) throw cartError;
        
        setCartItems(cartData || []);

        // Get the selected date, time, stylist, and location from local storage
        const bookingInfo = localStorage.getItem("booking_info");
        if (bookingInfo) {
          const parsedInfo = JSON.parse(bookingInfo);
          setSelectedDate(parsedInfo.date ? new Date(parsedInfo.date) : null);
          setSelectedTime(parsedInfo.time || null);
          setSelectedStylist(parsedInfo.stylist || null);
          
          if (parsedInfo.locationId) {
            const { data: locationData } = await supabase
              .from("locations")
              .select("*")
              .eq("id", parsedInfo.locationId)
              .single();
              
            setLocation(locationData);
          }
        }
      } catch (error) {
        console.error("Error fetching cart items:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCartItems();
  }, [user]);

  // Calculate the subtotal
  const subtotal = cartItems.reduce((total, item) => {
    const itemPrice = item.service?.selling_price || item.package?.price || 0;
    return total + itemPrice;
  }, 0);

  // Calculate loyalty point values
  useEffect(() => {
    if (settings?.enabled && user) {
      setShowLoyaltySection(true);
      // Calculate points to be earned
      const pointsToEarn = calculatePointsFromAmount(subtotal);
      // Calculate max points that can be redeemed
      const maxPoints = getMaxRedeemablePoints(subtotal);
      // Make sure user can't redeem more than they have
      const userMaxPoints = Math.min(maxPoints, walletBalance);
      setMaxPointsToRedeem(userMaxPoints);
      setPointsToRedeem(userMaxPoints);
    } else {
      setShowLoyaltySection(false);
      setPointsToRedeem(0);
      setMaxPointsToRedeem(0);
    }
  }, [settings, user, subtotal, walletBalance, calculatePointsFromAmount, getMaxRedeemablePoints]);

  // Calculate discount amount based on points
  useEffect(() => {
    if (usePoints && pointsToRedeem > 0) {
      const discount = calculateAmountFromPoints(pointsToRedeem);
      setPointsDiscountAmount(discount);

      // Calculate adjusted prices for services
      if (discount > 0 && subtotal > 0) {
        const discountRatio = discount / subtotal;
        const adjustedPrices: Record<string, number> = {};
        
        cartItems.forEach((item) => {
          if (item.service) {
            const originalPrice = item.service.selling_price;
            adjustedPrices[item.service.id] = originalPrice - (originalPrice * discountRatio);
          } else if (item.package) {
            const originalPrice = item.package.price;
            adjustedPrices[item.package.id] = originalPrice - (originalPrice * discountRatio);
          }
        });
        
        setAdjustedServicePrices(adjustedPrices);
      }
    } else {
      setPointsDiscountAmount(0);
      setAdjustedServicePrices({});
    }
  }, [usePoints, pointsToRedeem, calculateAmountFromPoints, cartItems, subtotal]);

  // Calculate final total with points discount
  const finalTotal = Math.max(0, subtotal - pointsDiscountAmount);

  const onSubmit = async (data: z.infer<typeof BookingConfirmationSchema>) => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time for your appointment");
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create a new appointment
      const appointmentData = {
        customer_id: user.id,
        start_time: new Date(`${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}`),
        end_time: new Date(`${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}`),
        status: "confirmed",
        total_price: finalTotal,
        points_earned: settings?.enabled ? calculatePointsFromAmount(subtotal) : 0,
        points_redeemed: usePoints ? pointsToRedeem : 0,
        points_discount_amount: pointsDiscountAmount,
        payment_method: paymentMethod,
        location: location?.id,
      };

      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert(appointmentData)
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // 2. Create bookings for each cart item
      for (const item of cartItems) {
        const bookingData = {
          appointment_id: appointment.id,
          service_id: item.service_id,
          package_id: item.package_id,
          employee_id: selectedStylist?.id,
          status: "confirmed",
          price_paid: item.service_id 
            ? (adjustedServicePrices[item.service_id] || item.service.selling_price)
            : (adjustedServicePrices[item.package_id] || item.package.price),
        };

        const { error: bookingError } = await supabase
          .from("bookings")
          .insert(bookingData);

        if (bookingError) throw bookingError;
      }

      // 3. Update loyalty points in user profile if points were redeemed
      if (settings?.enabled) {
        const pointsToEarn = calculatePointsFromAmount(subtotal);
        const newBalance = walletBalance + pointsToEarn - (usePoints ? pointsToRedeem : 0);
        
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ 
            wallet_balance: newBalance,
            last_used: new Date().toISOString()
          })
          .eq("id", user.id);

        if (profileError) throw profileError;
      }

      // 4. Clear the cart
      const { error: cartError } = await supabase
        .from("cart_items")
        .update({ status: "completed" })
        .eq("customer_id", user.id)
        .eq("status", "pending");

      if (cartError) throw cartError;

      // 5. Clear booking info from local storage
      localStorage.removeItem("booking_info");

      // 6. Navigate to confirmation page
      toast.success("Your appointment has been booked successfully!");
      navigate("/profile");
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast.error("Failed to book your appointment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <CustomerNavbar />
      <div className="container py-6">
        <h1 className="text-2xl font-bold mb-6">Confirm Your Booking</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Booking Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3">
                    <Calendar className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Date</p>
                      <p className="text-muted-foreground">
                        {selectedDate ? format(selectedDate, "EEEE, MMMM do, yyyy") : "Not selected"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Clock className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Time</p>
                      <p className="text-muted-foreground">
                        {selectedTime ? format(new Date(`2000-01-01T${selectedTime}`), "h:mm a") : "Not selected"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-muted-foreground">
                        {location?.name || "Not selected"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <User className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Stylist</p>
                      <p className="text-muted-foreground">
                        {selectedStylist?.name || "Any available stylist"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Selected Services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cartItems.length === 0 ? (
                    <p className="text-muted-foreground">No services selected</p>
                  ) : (
                    cartItems.map((item) => {
                      const isService = !!item.service;
                      const itemData = isService ? item.service : item.package;
                      const itemId = isService ? item.service.id : item.package.id;
                      const originalPrice = isService ? item.service.selling_price : item.package.price;
                      const adjustedPrice = adjustedServicePrices[itemId];
                      const displayPrice = adjustedPrice !== undefined ? adjustedPrice : originalPrice;
                      
                      return (
                        <div key={item.id} className="flex items-center justify-between py-2">
                          <div className="flex items-center space-x-3">
                            <Badge variant={isService ? "default" : "secondary"}>
                              {isService ? "Service" : "Package"}
                            </Badge>
                            <div>
                              <p className="font-medium">{itemData.name}</p>
                              {adjustedPrice !== undefined && (
                                <div className="flex items-center space-x-2">
                                  <p className="text-xs text-muted-foreground line-through">
                                    {formatPrice(originalPrice)}
                                  </p>
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-600">
                                    Points discount applied
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className={`font-medium ${adjustedPrice !== undefined ? "text-green-600" : ""}`}>
                            {formatPrice(displayPrice)}
                          </p>
                        </div>
                      );
                    })
                  )}
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    
                    {pointsDiscountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Loyalty Points Discount</span>
                        <span>-{formatPrice(pointsDiscountAmount)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between font-medium text-lg pt-2">
                      <span>Total</span>
                      <span>{formatPrice(finalTotal)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {showLoyaltySection && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="mr-2 h-5 w-5" />
                    Loyalty Points
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-primary/10 rounded-lg p-4">
                      <p className="font-medium">Your Points Balance</p>
                      <p className="text-2xl font-bold">{walletBalance}</p>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="font-medium">Points You'll Earn</p>
                      <p className="text-2xl font-bold">{settings?.enabled ? calculatePointsFromAmount(subtotal) : 0}</p>
                    </div>
                  </div>
                  
                  {walletBalance >= (settings?.min_redemption_points || 0) && (
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Use your points for this purchase?</p>
                          <p className="text-sm text-muted-foreground">
                            You have enough points to get a discount
                          </p>
                        </div>
                        <Switch 
                          checked={usePoints} 
                          onCheckedChange={setUsePoints}
                        />
                      </div>
                      
                      {usePoints && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label htmlFor="points-to-redeem" className="font-medium">
                              Points to redeem:
                            </label>
                            <div className="w-1/3">
                              <Input 
                                id="points-to-redeem"
                                type="number" 
                                min={0} 
                                max={maxPointsToRedeem}
                                value={pointsToRedeem} 
                                onChange={(e) => setPointsToRedeem(Math.min(Number(e.target.value), maxPointsToRedeem))}
                                className="text-right"
                              />
                            </div>
                          </div>
                          
                          <div className="text-sm text-muted-foreground flex justify-between">
                            <span>Maximum: {maxPointsToRedeem} points</span>
                            <span>Value: {formatPrice(pointsDiscountAmount)}</span>
                          </div>
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setPointsToRedeem(maxPointsToRedeem)}
                            className="w-full mt-2"
                          >
                            Use maximum points
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <p className="text-sm">
                          I agree to the <a href="#" className="text-primary">terms and conditions</a> and <a href="#" className="text-primary">privacy policy</a>.
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full md:w-auto"
                  disabled={submitting || !form.getValues().terms || cartItems.length === 0}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Confirm Booking
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>
          
          <div className="hidden md:block">
            <CartSummary 
              hideButtons 
              adjustedPrices={adjustedServicePrices}
              pointsDiscount={pointsDiscountAmount}
            />
          </div>
        </div>
      </div>
    </>
  );
}
