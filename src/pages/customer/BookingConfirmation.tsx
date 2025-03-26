
import { useCart } from "@/components/cart/CartContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { format, addMinutes, parseISO } from "date-fns";
import { ArrowRight, Calendar, Clock, MapPin, Package, Store, Tag } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useLocationTaxSettings } from "@/hooks/use-location-tax-settings";
import { useCoupons } from "@/hooks/use-coupons";

export default function BookingConfirmation() {
  const {
    items,
    selectedTimeSlots,
    selectedDate,
    selectedStylists,
    getTotalPrice,
    getTotalDuration,
    removeFromCart,
    appliedTaxId,
    setAppliedTaxId,
    appliedCouponId,
    selectedLocation
  } = useCart();
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [taxAmount, setTaxAmount] = useState(0);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [tax, setTax] = useState<any>(null);
  const [coupon, setCoupon] = useState<any>(null);
  const [locationDetails, setLocationDetails] = useState<any>(null);
  const { fetchLocationTaxSettings, fetchTaxDetails } = useLocationTaxSettings();
  const { validateCouponCode, getCouponById } = useCoupons();

  // Log for debugging
  useEffect(() => {
    console.log("BookingConfirmation - appliedCouponId:", appliedCouponId);
  }, [appliedCouponId]);

  useEffect(() => {
    const fetchLocationDetails = async () => {
      if (selectedLocation) {
        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .eq('id', selectedLocation)
          .single();
        
        if (!error && data) {
          setLocationDetails(data);
        }
      }
    };

    fetchLocationDetails();
  }, [selectedLocation]);

  useEffect(() => {
    const fetchTaxSettings = async () => {
      if (!selectedLocation) return;
      
      if (!appliedTaxId) {
        const settings = await fetchLocationTaxSettings(selectedLocation);
        
        if (settings && settings.service_tax_id) {
          setAppliedTaxId(settings.service_tax_id);
        }
      }
    };

    fetchTaxSettings();
  }, [selectedLocation, appliedTaxId, setAppliedTaxId, fetchLocationTaxSettings]);

  useEffect(() => {
    const loadTaxDetails = async () => {
      if (!appliedTaxId) {
        setTax(null);
        setTaxAmount(0);
        return;
      }
      
      const taxData = await fetchTaxDetails(appliedTaxId);
      if (taxData) {
        setTax(taxData);
        
        const subtotal = getTotalPrice();
        const afterCoupon = subtotal - couponDiscount;
        const newTaxAmount = afterCoupon * (taxData.percentage / 100);
        setTaxAmount(newTaxAmount);
      }
    };
    
    loadTaxDetails();
  }, [appliedTaxId, couponDiscount, getTotalPrice, fetchTaxDetails]);

  // Fetch and load coupon details
  useEffect(() => {
    const loadCouponDetails = async () => {
      if (!appliedCouponId) {
        console.log("No coupon ID applied");
        setCoupon(null);
        setCouponDiscount(0);
        return;
      }
      
      console.log("Fetching coupon details for ID:", appliedCouponId);
      try {
        // Try to get from getCouponById first
        const couponData = await getCouponById(appliedCouponId);
        if (couponData) {
          console.log("Coupon found via getCouponById:", couponData);
          processCouponData(couponData);
          return;
        }
        
        // Fallback to direct database query
        const { data, error } = await supabase
          .from('coupons')
          .select('*')
          .eq('id', appliedCouponId)
          .single();
        
        if (error) {
          console.error("Error fetching coupon:", error);
          setCoupon(null);
          setCouponDiscount(0);
          return;
        }
        
        if (data) {
          console.log("Coupon data loaded from direct query:", data);
          processCouponData(data);
        }
      } catch (error) {
        console.error("Error in loadCouponDetails:", error);
        setCoupon(null);
        setCouponDiscount(0);
      }
    };
    
    const processCouponData = (data: any) => {
      setCoupon(data);
      const subtotal = getTotalPrice();
      const newDiscount = data.discount_type === 'percentage' 
        ? subtotal * (data.discount_value / 100)
        : Math.min(data.discount_value, subtotal);
      
      setCouponDiscount(newDiscount);
      
      if (tax) {
        const afterCoupon = subtotal - newDiscount;
        const newTaxAmount = afterCoupon * (tax.percentage / 100);
        setTaxAmount(newTaxAmount);
      }
    };
    
    loadCouponDetails();
  }, [appliedCouponId, getTotalPrice, tax, getCouponById]);

  if (!selectedDate || Object.keys(selectedTimeSlots).length === 0) {
    navigate("/schedule");
    return null;
  }

  const sortedItems = [...items].sort((a, b) => {
    const aTime = selectedTimeSlots[a.id] || "00:00";
    const bTime = selectedTimeSlots[b.id] || "00:00";
    return aTime.localeCompare(bTime);
  });

  const firstStartTime = Object.values(selectedTimeSlots)[0];
  const totalDuration = getTotalDuration();
  const totalHours = Math.floor(totalDuration / 60);
  const remainingMinutes = totalDuration % 60;
  const durationDisplay =
    totalHours > 0
      ? `${totalHours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ""}`
      : `${remainingMinutes}m`;

  const calculateEndTime = (startTime: string, duration: number) => {
    if (!selectedDate) return "";
    const dateTimeString = `${format(selectedDate, "yyyy-MM-dd")} ${startTime}`;
    const startDateTime = new Date(dateTimeString);
    const endDateTime = addMinutes(startDateTime, duration);
    return format(endDateTime, "HH:mm");
  };

  const firstItemStartTime = selectedTimeSlots[sortedItems[0]?.id] || "00:00";
  const lastItemEndTime = addMinutes(
    new Date(`${format(selectedDate, "yyyy-MM-dd")} ${firstItemStartTime}`),
    totalDuration
  );

  const subtotal = getTotalPrice();
  const discountedSubtotal = subtotal - couponDiscount;
  const totalPrice = discountedSubtotal + taxAmount;

  const handleBookingConfirmation = async () => {
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please login to continue");
        return;
      }

      const customer_id = session.user.id;

      const firstStartTime = selectedTimeSlots[sortedItems[0]?.id] || "00:00";
      const startDateTime = new Date(
        `${format(selectedDate, "yyyy-MM-dd")} ${firstStartTime}`
      );
      if (isNaN(startDateTime.getTime())) {
        console.error(
          `Invalid date generated, date: ${format(
            selectedDate,
            "yyyy-MM-dd"
          )}, time: ${firstStartTime}`
        );
        return;
      }
      const endDateTime = addMinutes(startDateTime, totalDuration);

      console.log("Creating appointment with:", {
        subtotal,
        couponDiscount,
        discountedSubtotal,
        taxAmount,
        totalPrice,
        couponId: appliedCouponId,
        taxId: appliedTaxId,
        couponDetails: coupon
      });

      const { data: appointmentData, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          customer_id: customer_id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          notes: notes,
          status: "booked",
          number_of_bookings: items.length,
          total_price: totalPrice,
          total_duration: totalDuration,
          tax_amount: taxAmount,
          tax_id: appliedTaxId,
          coupon_id: appliedCouponId,
          discount_type: coupon?.discount_type || null,
          discount_value: coupon?.discount_value || 0,
          location: selectedLocation
        })
        .select();

      if (appointmentError) {
        console.error("Error inserting appointment:", appointmentError);
        toast.error("Failed to create appointment. Please try again.");
        throw appointmentError;
      }

      const appointmentId = appointmentData[0].id;
      
      const bookingPromises = [];

      for (const item of sortedItems) {
        const itemStartTimeString = selectedTimeSlots[item.id];
        let currentStartTime = new Date(
          `${format(selectedDate, "yyyy-MM-dd")} ${itemStartTimeString}`
        );

        if (item.service_id) {
          const stylistId =
            selectedStylists[item.id] && selectedStylists[item.id] !== "any"
              ? selectedStylists[item.id]
              : null;
          const itemDuration = item.service?.duration || 0;
          const itemEndTime = addMinutes(currentStartTime, itemDuration);

          const bookingPromise = supabase.from("bookings").insert({
            appointment_id: appointmentId,
            service_id: item.service_id,
            employee_id: stylistId,
            status: "booked",
            price_paid: item.selling_price || item.service?.selling_price || 0,
            original_price: item.service?.original_price || 0,
            start_time: currentStartTime.toISOString(),
            end_time: itemEndTime.toISOString(),
          });

          bookingPromises.push(bookingPromise);
        } else if (item.package_id) {
          if (
            item.package?.package_services &&
            item.package.package_services.length > 0
          ) {
            for (const packageService of item.package.package_services) {
              const stylistId =
                selectedStylists[packageService?.service?.id] &&
                selectedStylists[packageService.service?.id] !== "any"
                  ? selectedStylists[packageService?.service?.id]
                  : null;
              const serviceDuration = packageService.service?.duration || 0;
              const serviceEndTime = addMinutes(
                currentStartTime,
                serviceDuration
              );

              const servicePriceInPackage = 
                packageService.package_selling_price !== undefined && 
                packageService.package_selling_price !== null
                  ? packageService.package_selling_price
                  : packageService.service.selling_price;

              const bookingPromise = supabase.from("bookings").insert({
                appointment_id: appointmentId,
                service_id: packageService.service.id,
                package_id: item.package_id,
                employee_id: stylistId,
                status: "booked",
                price_paid: servicePriceInPackage,
                start_time: currentStartTime.toISOString(),
                end_time: serviceEndTime.toISOString(),
              });

              bookingPromises.push(bookingPromise);

              currentStartTime = serviceEndTime;
            }
          }

          if (item.customized_services && item.customized_services.length > 0) {
            const { data: allServices } = await supabase
              .from("services")
              .select("*")
              .in("id", item.customized_services);

            if (allServices) {
              for (const serviceId of item.customized_services) {
                const isBaseService = item.package?.package_services.some(
                  (ps: any) => ps.service.id === serviceId
                );

                if (!isBaseService) {
                  const customService = allServices.find(
                    (s) => s.id === serviceId
                  );

                  if (customService) {
                    const serviceDuration = customService.duration || 0;
                    const serviceEndTime = addMinutes(
                      currentStartTime,
                      serviceDuration
                    );
                    const stylistId =
                      selectedStylists[serviceId] &&
                      selectedStylists[serviceId] !== "any"
                        ? selectedStylists[serviceId]
                        : null;
                    
                    const bookingPromise = supabase.from("bookings").insert({
                      appointment_id: appointmentId,
                      service_id: serviceId,
                      package_id: item.package_id,
                      employee_id: stylistId,
                      status: "confirmed",
                      price_paid: customService.selling_price || 0,
                      start_time: currentStartTime.toISOString(),
                      end_time: serviceEndTime.toISOString(),
                    });

                    bookingPromises.push(bookingPromise);

                    currentStartTime = serviceEndTime;
                  }
                }
              }
            }
          }
        }
      }

      const bookingResults = await Promise.all(bookingPromises);

      const bookingErrors = bookingResults.filter((result) => result.error);
      if (bookingErrors.length > 0) {
        console.error("Errors inserting bookings:", bookingErrors);
        throw new Error("Failed to create some bookings. Please try again.");
      }

      toast.success("Booking confirmed successfully!");
      clearCart();
      navigate("/profile");
    } catch (error: any) {
      console.error("Booking error:", error);
      toast.error(error.message || "Failed to confirm booking");
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    for (const item of items) {
      await removeFromCart(item.id);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="container max-w-2xl mx-auto py-6 px-4">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Make Sure Everything's Right</h1>
            <div className="flex items-center gap-2 text-muted-foreground mt-2">
              <Calendar className="h-4 w-4" />
              <p>{format(selectedDate, "EEEE d MMMM")}</p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {format(
                  new Date(`2000/01/01 ${firstItemStartTime}`),
                  "hh:mm a"
                )}
              </span>
              <ArrowRight className="h-4 w-4" />
              <span>
                {format(lastItemEndTime, "hh:mm a")}
                <span className="ml-1 text-sm">({durationDisplay})</span>
              </span>
            </div>
            {locationDetails && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{locationDetails.name}</span>
                {locationDetails.address && (
                  <span className="text-xs">• {locationDetails.address}</span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {sortedItems.map((item, index) => {
              const itemStartTime = selectedTimeSlots[item.id] || "00:00";
              const itemDuration =
                item.service?.duration ||
                item.duration ||
                item.package?.duration ||
                0;
              const itemEndTime = calculateEndTime(itemStartTime, itemDuration);

              const hours = Math.floor(itemDuration / 60);
              const minutes = itemDuration % 60;
              const itemDurationDisplay =
                hours > 0
                  ? `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`
                  : `${minutes}m`;

              return (
                <div
                  key={item.id}
                  className="flex justify-between items-start py-4 border-b"
                >
                  <div className="space-y-1">
                    <h3 className="text-sm">
                      {item.service?.name || item.package?.name}
                    </h3>
                    <div className="space-y-0.5">
                      {selectedStylists[item.id] &&
                        selectedStylists[item.id] !== "any" && (
                          <p className="text-sm text-muted-foreground">
                            with {selectedStylists[item.id]}
                          </p>
                        )}
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(
                          new Date(`2000/01/01 ${itemStartTime}`),
                          "hh:mm a"
                        )}{" "}
                        -{" "}
                        {format(
                          new Date(`2000/01/01 ${itemEndTime}`),
                          "hh:mm a"
                        )}{" "}
                        ({itemDurationDisplay})
                      </p>
                    </div>
                  </div>
                  <div className="font-medium">
                    ₹
                    {item.selling_price ||
                      item.service?.selling_price ||
                      item.package?.price}
                  </div>
                </div>
              );
            })}

            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                <span className="font-bold">Pay at Salon</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                
                {coupon && couponDiscount > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Tag className="h-3 w-3 text-green-600" />
                      <Badge variant="outline" className="text-xs font-medium text-green-600">
                        {coupon.code} - {coupon.discount_type === 'percentage' 
                          ? `${coupon.discount_value}% off` 
                          : `₹${coupon.discount_value} off`}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-₹{couponDiscount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                
                {tax && taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {tax.name} ({tax.percentage}%)
                    </span>
                    <span>₹{taxAmount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-base font-medium pt-1 border-t">
                  <span>Total</span>
                  <span>₹{totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            <div className="space-y-2 mt-8">
              <span className="font-medium">Booking Notes</span>
              <Textarea
                placeholder="Add any special requests or notes for your booking..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none"
                rows={4}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-background">
        <div className="container max-w-2xl mx-auto px-4">
          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="text-2xl font-bold text-foreground">
                ₹{totalPrice.toFixed(2)}
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>{items.length} services</span>
                <span>•</span>
                <Clock className="h-4 w-4" />
                <span>{durationDisplay}</span>
              </div>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={handleBookingConfirmation}
              disabled={isLoading}
            >
              {isLoading ? "Confirming..." : "Confirm"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
