import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addMinutes, parseISO } from "date-fns";
import { useCart } from "@/components/cart/CartContext";
import CustomerNavbar from "@/components/customer/CustomerNavbar";
import { formatPrice } from "@/lib/utils";
import { Award, CalendarDays, Clock, User, MapPin, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLoyaltyInCheckout } from "@/pages/admin/bookings/hooks/useLoyaltyInCheckout";

export default function BookingConfirmation() {
  const navigate = useNavigate();
  const { 
    items, 
    selectedDate, 
    selectedTimeSlots, 
    getTotalPrice, 
    getTotalDuration, 
    selectedLocation, 
    appliedTaxId, 
    appliedCouponId, 
    couponDiscount,
    membershipDiscount,
    membershipId, 
    membershipName,
    setItems, 
    setSelectedDate, 
    setSelectedTimeSlots,
    setAppliedTaxId,
    setAppliedCouponId,
    setCouponDiscount,
    setMembershipDiscount,
    setMembershipId,
    setMembershipName
  } = useCart();

  const [locationDetails, setLocationDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [taxAmount, setTaxAmount] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const userFetchedRef = useRef(false);
  const taxFetchedRef = useRef(false);
  const serviceFetchedRef = useRef(false);
  const packageFetchedRef = useRef(false);
  const [serviceItems, setServiceItems] = useState<any[]>([]);
  const [packageItems, setPackageItems] = useState<any[]>([]);
  const [adjustedServicePrices, setAdjustedServicePrices] = useState<Record<string, number>>({});

  // Prepare data for loyalty integration
  const serviceIds = items
    .filter(item => item.type === 'service' && item.service_id)
    .map(item => item.service_id as string);
  
  const packageIds = items
    .filter(item => item.type === 'package' && item.package_id)
    .map(item => item.package_id as string);
  
  // Map cart items to service and package objects for loyalty hook
  const servicesData = items
    .filter(item => item.type === 'service')
    .map(item => ({
      id: item.service_id || '',
      selling_price: item.selling_price || 0,
      name: item.name || ''
    }));
  
  const packagesData = items
    .filter(item => item.type === 'package')
    .map(item => ({
      id: item.package_id || '',
      price: item.selling_price || 0,
      name: item.name || ''
    }));
    
  // Use loyalty hook
  const loyalty = useLoyaltyInCheckout({
    customerId: customerData?.id,
    selectedServices: serviceIds,
    selectedPackages: packageIds,
    services: servicesData,
    packages: packagesData,
    subtotal: subtotal,
    discountedSubtotal: subtotal - membershipDiscount - couponDiscount
  });

  // Fetch user data
  useEffect(() => {
    if (userFetchedRef.current) return;
    userFetchedRef.current = true;

    const fetchUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUser(session.user);
          
          // Also fetch customer profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (profileData) {
            setCustomerData(profileData);
          }
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [navigate]);

  // Set up subtotal
  useEffect(() => {
    const total = getTotalPrice();
    setSubtotal(total);
  }, [getTotalPrice, items]);

  // Calculate tax 
  useEffect(() => {
    const fetchTaxRate = async () => {
      if (!appliedTaxId || taxFetchedRef.current) return;
      taxFetchedRef.current = true;

      try {
        const { data: taxRate } = await supabase
          .from('tax_rates')
          .select('*')
          .eq('id', appliedTaxId)
          .single();

        if (taxRate) {
          // Apply tax after all discounts including loyalty
          const afterCouponDiscount = subtotal - membershipDiscount - couponDiscount;
          const finalSubtotal = afterCouponDiscount - loyalty.pointsDiscountAmount;
          setTaxAmount(finalSubtotal * (taxRate.percentage / 100));
        }
      } catch (error) {
        console.error("Error fetching tax rate:", error);
      }
    };

    fetchTaxRate();
  }, [appliedTaxId, subtotal, membershipDiscount, couponDiscount, loyalty.pointsDiscountAmount]);

  // Update tax amount when loyalty discount changes
  useEffect(() => {
    if (!appliedTaxId || !taxFetchedRef.current) return;

    const updateTaxWithLoyalty = async () => {
      try {
        const { data: taxRate } = await supabase
          .from('tax_rates')
          .select('*')
          .eq('id', appliedTaxId)
          .single();

        if (taxRate) {
          const afterCouponDiscount = subtotal - membershipDiscount - couponDiscount;
          const finalSubtotal = afterCouponDiscount - loyalty.pointsDiscountAmount;
          setTaxAmount(finalSubtotal * (taxRate.percentage / 100));
        }
      } catch (error) {
        console.error("Error updating tax with loyalty:", error);
      }
    };

    updateTaxWithLoyalty();
  }, [loyalty.pointsDiscountAmount, appliedTaxId, subtotal, membershipDiscount, couponDiscount]);

  // Fetch location details
  useEffect(() => {
    const fetchLocation = async () => {
      if (!selectedLocation) return;

      try {
        const { data: location } = await supabase
          .from('locations')
          .select('*')
          .eq('id', selectedLocation)
          .single();

        if (location) {
          setLocationDetails(location);
        }
      } catch (error) {
        console.error("Error fetching location:", error);
      }
    };

    fetchLocation();
  }, [selectedLocation]);

  // Fetch complete service details
  useEffect(() => {
    const fetchServices = async () => {
      if (serviceFetchedRef.current || items.length === 0) return;
      serviceFetchedRef.current = true;

      const serviceIds = items
        .filter(item => item.type === 'service')
        .map(item => item.service_id);

      if (serviceIds.length === 0) return;

      try {
        const { data: services } = await supabase
          .from('services')
          .select('*')
          .in('id', serviceIds);

        if (services) {
          const serviceItemsWithDetails = items
            .filter(item => item.type === 'service')
            .map(item => {
              const serviceDetails = services.find(s => s.id === item.service_id);
              return { ...item, service: serviceDetails };
            });

          setServiceItems(serviceItemsWithDetails);
        }
      } catch (error) {
        console.error("Error fetching service details:", error);
      }
    };

    fetchServices();
  }, [items]);

  // Fetch complete package details
  useEffect(() => {
    const fetchPackages = async () => {
      if (packageFetchedRef.current || items.length === 0) return;
      packageFetchedRef.current = true;

      const packageIds = items
        .filter(item => item.type === 'package')
        .map(item => item.package_id);

      if (packageIds.length === 0) return;

      try {
        const { data: packages } = await supabase
          .from('packages')
          .select('*, package_services(*, service:services(*))') 
          .in('id', packageIds);

        if (packages) {
          const packageItemsWithDetails = items
            .filter(item => item.type === 'package')
            .map(item => {
              const packageDetails = packages.find(p => p.id === item.package_id);
              return { ...item, package: packageDetails };
            });

          setPackageItems(packageItemsWithDetails);
        }
      } catch (error) {
        console.error("Error fetching package details:", error);
      }
    };

    fetchPackages();
  }, [items]);

  // Apply loyalty point discounts to services
  useEffect(() => {
    if (!loyalty.isLoyaltyEnabled || loyalty.pointsDiscountAmount <= 0 || subtotal <= 0) {
      setAdjustedServicePrices({});
      return;
    }

    // Combine service and package items for discount calculation
    const discountRatio = loyalty.pointsDiscountAmount / subtotal;
    const newAdjustedPrices: Record<string, number> = {};
    
    // Apply discount to individual services proportionally
    serviceItems.forEach((item) => {
      if (item.service_id) {
        const originalPrice = item.selling_price || item.service?.selling_price || 0;
        const discountAmount = originalPrice * discountRatio;
        newAdjustedPrices[item.service_id] = Math.max(0, originalPrice - discountAmount);
      }
    });

    // Apply discount to package services proportionally
    packageItems.forEach((item) => {
      if (item.package_id && item.package?.package_services) {
        const packagePrice = item.selling_price || item.package?.price || 0;
        const discountAmount = packagePrice * discountRatio;
        
        item.package.package_services.forEach((ps) => {
          const serviceId = ps.service.id;
          const servicePrice = ps.package_selling_price !== undefined ? 
            ps.package_selling_price : ps.service.selling_price;
          
          // Calculate service's proportion of package price
          const proportion = servicePrice / packagePrice;
          const serviceDiscountAmount = discountAmount * proportion;
          
          newAdjustedPrices[serviceId] = Math.max(0, servicePrice - serviceDiscountAmount);
        });
      }
    });
    
    setAdjustedServicePrices(newAdjustedPrices);
  }, [loyalty.isLoyaltyEnabled, loyalty.pointsDiscountAmount, subtotal, serviceItems, packageItems]);

  const getItemPrice = (item: any) => {
    if (!item) return 0;
    
    // First check if there's a loyalty-adjusted price for this item
    if (item.service_id && adjustedServicePrices[item.service_id]) {
      return adjustedServicePrices[item.service_id];
    }
    
    // Otherwise return the regular price
    return item.selling_price || item.service?.selling_price || item.package?.price || item.price || 0;
  };
  
  const handleBookNow = async () => {
    if (!user || !customerData) {
      toast.error("Please sign in to complete your booking");
      navigate('/');
      return;
    }

    if (items.length === 0) {
      toast.error("Your cart is empty");
      navigate('/services');
      return;
    }

    if (!selectedDate) {
      toast.error("Please select a date for your appointment");
      navigate('/schedule');
      return;
    }

    if (Object.keys(selectedTimeSlots).length === 0) {
      toast.error("Please select time slots for your services");
      navigate('/schedule');
      return;
    }

    setLoading(true);

    try {
      // Calculate total duration and total price
      const totalDuration = getTotalDuration();
      
      // Get earliest start time from selected time slots
      const timeSlots = Object.values(selectedTimeSlots).sort();
      const earliestTimeSlot = timeSlots[0];
      
      // Calculate end time by adding total duration to earliest start time
      const startDateTime = new Date(`${format(selectedDate, 'yyyy-MM-dd')} ${earliestTimeSlot}`);
      const endDateTime = addMinutes(startDateTime, totalDuration);
      
      // Create appointment record
      const afterDiscountSubtotal = subtotal - membershipDiscount - couponDiscount;
      const afterLoyaltySubtotal = afterDiscountSubtotal - loyalty.pointsDiscountAmount;
      const totalPrice = afterLoyaltySubtotal + taxAmount;
      
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          customer_id: customerData.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: 'confirmed',
          total_price: totalPrice,
          total_duration: totalDuration,
          location: selectedLocation,
          tax_id: appliedTaxId,
          tax_amount: taxAmount,
          coupon_id: appliedCouponId,
          coupon_amount: couponDiscount,
          membership_id: membershipId,
          membership_name: membershipName,
          membership_discount: membershipDiscount,
          points_earned: loyalty.pointsToEarn,
          points_redeemed: loyalty.pointsToRedeem,
          points_discount_amount: loyalty.pointsDiscountAmount
        })
        .select()
        .single();

      if (appointmentError) {
        throw appointmentError;
      }

      // Create booking records for each service
      for (const item of items) {
        const bookingData: any = {
          appointment_id: appointment.id,
          start_time: new Date(`${format(selectedDate, 'yyyy-MM-dd')} ${selectedTimeSlots[item.id]}`).toISOString(),
        };

        // Set the end time by adding item duration to start time
        const itemDuration = item.duration || 
          (item.type === 'service' ? item.service?.duration : 0) || 
          (item.type === 'package' ? getTotalDuration([], [item.id], [item], packageItems) : 0) || 
          0;
        
        const endTime = addMinutes(
          new Date(`${format(selectedDate, 'yyyy-MM-dd')} ${selectedTimeSlots[item.id]}`), 
          itemDuration
        );
        
        bookingData.end_time = endTime.toISOString();
        
        // Set service or package ID based on item type
        if (item.type === 'service') {
          bookingData.service_id = item.service_id;
          
          // Get the adjusted price with loyalty discount
          bookingData.price_paid = adjustedServicePrices[item.service_id] || item.selling_price || item.service?.selling_price || 0;
          bookingData.original_price = item.selling_price || item.service?.selling_price || 0;
        } else if (item.type === 'package') {
          bookingData.package_id = item.package_id;
          bookingData.price_paid = item.selling_price || item.package?.price || 0;
          bookingData.original_price = item.selling_price || item.package?.price || 0;
        }

        const { error: bookingError } = await supabase
          .from('bookings')
          .insert(bookingData);

        if (bookingError) {
          throw bookingError;
        }
      }

      // Update user's loyalty points balance if needed
      if (loyalty.isLoyaltyEnabled) {
        // First, handle points redemption
        if (loyalty.pointsToRedeem > 0) {
          const newWalletBalance = Math.max(0, (customerData.wallet_balance || 0) - loyalty.pointsToRedeem);
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              wallet_balance: newWalletBalance,
              last_used: new Date().toISOString()
            })
            .eq('id', customerData.id);
            
          if (updateError) {
            console.error("Error updating wallet balance after redemption:", updateError);
          }
        }
        
        // Then, add newly earned points
        if (loyalty.pointsToEarn > 0) {
          const updatedBalance = ((customerData.wallet_balance || 0) - (loyalty.pointsToRedeem || 0)) + loyalty.pointsToEarn;
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              wallet_balance: updatedBalance,
              last_used: new Date().toISOString()
            })
            .eq('id', customerData.id);
            
          if (updateError) {
            console.error("Error updating wallet balance after earning:", updateError);
          }
        }
      }

      // Clear cart and redirect
      setItems([]);
      setSelectedDate(null);
      setSelectedTimeSlots({});
      setAppliedTaxId(null);
      setAppliedCouponId(null);
      setCouponDiscount(0);
      setMembershipDiscount(0);
      setMembershipId(null);
      setMembershipName(null);
      
      toast.success("Booking confirmed successfully!");
      navigate('/user/appointments');
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast.error(error.message || "Failed to create booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate final price including all discounts and tax
  const afterDiscountSubtotal = subtotal - membershipDiscount - couponDiscount;
  const afterLoyaltySubtotal = afterDiscountSubtotal - loyalty.pointsDiscountAmount;
  const totalPrice = afterLoyaltySubtotal + taxAmount;

  // Group items by time slot for better presentation
  const itemsByTime = Object.entries(selectedTimeSlots).reduce((acc, [itemId, timeSlot]) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return acc;
    
    if (!acc[timeSlot]) {
      acc[timeSlot] = [];
    }
    
    acc[timeSlot].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  // Sort time slots chronologically
  const sortedTimeSlots = Object.keys(itemsByTime).sort();

  if (items.length === 0) {
    navigate('/services');
    return null;
  }

  if (!selectedDate) {
    navigate('/schedule');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <CustomerNavbar />
      
      <div className="flex-1 container max-w-6xl py-8 px-4 md:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Booking Confirmation</h1>
          <p className="text-muted-foreground">Review your booking details before confirming</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-12">
          <div className="md:col-span-8 space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Appointment Details</h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CalendarDays className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Date</p>
                    <p className="text-muted-foreground">
                      {format(selectedDate, "EEEE, MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Duration</p>
                    <p className="text-muted-foreground">{getTotalDuration()} minutes</p>
                  </div>
                </div>
                
                {user && (
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Customer</p>
                      <p className="text-muted-foreground">{user.user_metadata?.name || user.email}</p>
                    </div>
                  </div>
                )}
                
                {locationDetails && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{locationDetails.name}</p>
                      <p className="text-muted-foreground">{locationDetails.address}</p>
                      {locationDetails.phone && (
                        <p className="text-muted-foreground">{locationDetails.phone}</p>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Payment</p>
                    <p className="text-muted-foreground">Pay at salon</p>
                  </div>
                </div>

                {loyalty.isLoyaltyEnabled && (
                  <div className="flex items-start gap-3">
                    <Award className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Loyalty Points</p>
                      {loyalty.walletBalance > 0 && (
                        <div className="flex items-center gap-2">
                          <p className="text-muted-foreground">Current Balance:</p>
                          <Badge variant="outline">{loyalty.walletBalance} points</Badge>
                        </div>
                      )}
                      {loyalty.pointsToRedeem > 0 && (
                        <div className="flex items-center gap-2 text-green-600">
                          <p>Points Redeemed:</p>
                          <Badge variant="outline" className="text-green-600">
                            -{loyalty.pointsToRedeem} points
                          </Badge>
                        </div>
                      )}
                      {loyalty.pointsToEarn > 0 && (
                        <div className="flex items-center gap-2">
                          <p className="text-muted-foreground">Points to Earn:</p>
                          <Badge variant="secondary">+{loyalty.pointsToEarn} points</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
            
            <Card>
              <div className="p-6 pb-0">
                <h2 className="text-lg font-semibold mb-4">Selected Services</h2>
              </div>
              
              <ScrollArea className="h-[300px]">
                <div className="p-6 pt-0 space-y-6">
                  {sortedTimeSlots.map(timeSlot => (
                    <div key={timeSlot} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="px-3 py-1 font-normal">
                          {timeSlot}
                        </Badge>
                      </div>
                      
                      {itemsByTime[timeSlot].map(item => {
                        const itemDuration = item.duration || 
                          (item.type === 'service' ? item.service?.duration : null) || 
                          (item.type === 'package' ? getTotalDuration([], [item.id], serviceItems, packageItems) : null) || 
                          0;
                        
                        const endTime = addMinutes(
                          new Date(`${format(selectedDate, 'yyyy-MM-dd')} ${timeSlot}`), 
                          itemDuration
                        );
                        
                        const itemPrice = getItemPrice(item);
                        const originalPrice = item.selling_price || item.service?.selling_price || item.package?.price || 0;
                        const isDiscounted = itemPrice !== originalPrice;
                        
                        return (
                          <div key={item.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-medium">
                                  {item.name || 
                                   (item.type === 'service' ? item.service?.name : null) || 
                                   (item.type === 'package' ? item.package?.name : null)}
                                </h3>
                                
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>
                                    {timeSlot} - {format(endTime, "HH:mm")} ({itemDuration} min)
                                  </span>
                                </div>
                                
                                <div className="mt-2">
                                  {isDiscounted ? (
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium line-through text-muted-foreground">
                                        {formatPrice(originalPrice)}
                                      </p>
                                      <p className="text-sm font-medium text-green-600">
                                        {formatPrice(itemPrice)}
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="text-sm font-medium">
                                      {formatPrice(itemPrice)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {item.type === 'package' && item.package?.package_services && (
                              <div className="mt-4 pl-4 border-l">
                                <p className="text-sm text-muted-foreground mb-2">
                                  Included services:
                                </p>
                                <div className="space-y-2">
                                  {item.package.package_services.map((ps) => {
                                    const servicePrice = ps.package_selling_price !== undefined ? 
                                      ps.package_selling_price : ps.service.selling_price;
                                    const discountedPrice = adjustedServicePrices[ps.service.id];
                                    const hasDiscount = discountedPrice !== undefined && discountedPrice < servicePrice;
                                    
                                    return (
                                      <div key={ps.service.id} className="flex justify-between text-sm">
                                        <span>{ps.service.name} ({ps.service.duration} min)</span>
                                        {hasDiscount ? (
                                          <div className="flex items-center gap-2">
                                            <span className="line-through text-muted-foreground">{formatPrice(servicePrice)}</span>
                                            <span className="text-green-600">{formatPrice(discountedPrice)}</span>
                                          </div>
                                        ) : (
                                          <span>{formatPrice(servicePrice)}</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>
          
          <div className="md:col-span-4">
            <Card className="p-6 sticky top-24">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                
                {membershipDiscount > 0 && membershipName && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      Membership ({membershipName})
                    </span>
                    <span>-{formatPrice(membershipDiscount)}</span>
                  </div>
                )}
                
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Coupon Discount</span>
                    <span>-{formatPrice(couponDiscount)}</span>
                  </div>
                )}
                
                {loyalty.pointsDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      Loyalty Points ({loyalty.pointsToRedeem})
                    </span>
                    <span>-{formatPrice(loyalty.pointsDiscountAmount)}</span>
                  </div>
                )}
                
                {taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatPrice(taxAmount)}</span>
                  </div>
                )}
                
                <Separator className="my-2" />
                
                <div className="flex justify-between font-medium text-base">
                  <span>Total</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                
                {loyalty.pointsToEarn > 0 && (
                  <div className="flex justify-between text-sm mt-2">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Award className="h-4 w-4" />
                      You will earn
                    </span>
                    <Badge variant="secondary" className="font-medium">
                      {loyalty.pointsToEarn} points
                    </Badge>
                  </div>
                )}
                
                <Button 
                  className="w-full mt-6" 
                  onClick={handleBookNow}
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Confirm Booking"}
                </Button>
                
                <p className="text-xs text-center text-muted-foreground mt-2">
                  By confirming, you agree to our terms and conditions
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
