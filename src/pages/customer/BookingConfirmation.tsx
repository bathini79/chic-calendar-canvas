
import { useCart } from "@/components/cart/CartContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { format, addMinutes, parseISO } from "date-fns";
import {
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Package,
  Store,
  Tag,
  Search,
  X,
  Check,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useLocationTaxSettings } from "@/hooks/use-location-tax-settings";
import { useCoupons } from "@/hooks/use-coupons";
import { useCustomerMemberships } from "@/hooks/use-customer-memberships";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Confetti, type ConfettiRef } from "@/components/ui/confetti";
import confetti from "canvas-confetti";

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
    setAppliedCouponId,
    appliedMembershipId,
    setAppliedMembershipId,
    selectedLocation,
  } = useCart();
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [taxAmount, setTaxAmount] = useState(0);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [membershipDiscount, setMembershipDiscount] = useState(0);
  const [tax, setTax] = useState(null);
  const [coupon, setCoupon] = useState(null);
  const [membership, setMembership] = useState(null);
  const [locationDetails, setLocationDetails] = useState(null);
  const { fetchLocationTaxSettings, fetchTaxDetails } = useLocationTaxSettings();
  const { coupons, isLoading: couponsLoading, validateCouponCode, getCouponById } = useCoupons();
  const { customerMemberships, isLoading: membershipsLoading, getApplicableMembershipDiscount } = useCustomerMemberships();
  const [couponSearchValue, setCouponSearchValue] = useState("");
  const [openCouponPopover, setOpenCouponPopover] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const confettiRef = useRef<ConfettiRef>(null);

  useEffect(() => {
    console.log("BookingConfirmation - state:", {
      appliedCouponId,
      appliedMembershipId,
      items: items.length
    });
  }, [appliedCouponId, appliedMembershipId, items]);

  useEffect(() => {
    const fetchLocationDetails = async () => {
      if (selectedLocation) {
        const { data, error } = await supabase
          .from("locations")
          .select("*")
          .eq("id", selectedLocation)
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
  }, [
    selectedLocation,
    appliedTaxId,
    setAppliedTaxId,
    fetchLocationTaxSettings,
  ]);

  useEffect(() => {
    const loadTaxDetails = async () => {
      if (!appliedTaxId) {
        setTax(null);
        setTaxAmount(0);
        return;
      }
      if(!tax){
        try {
          const taxData = await fetchTaxDetails(appliedTaxId);
          if (taxData) {
            setTax(taxData);

            const subtotal = items && items.length > 0 ? getTotalPrice() : 0;
            const afterDiscounts = subtotal - couponDiscount - membershipDiscount;
            const newTaxAmount = afterDiscounts * (taxData.percentage / 100);
            setTaxAmount(newTaxAmount);
          }
        } catch (error) {
          console.error("Error loading tax details:", error);
        }
      }
    };

    loadTaxDetails();
  }, [appliedTaxId, couponDiscount, membershipDiscount, getTotalPrice, fetchTaxDetails, items, tax]);

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
        const couponData = await getCouponById(appliedCouponId);
        if (couponData) {
          console.log("Coupon found via getCouponById:", couponData);
          processCouponData(couponData);
          return;
        }

        const { data, error } = await supabase
          .from("coupons")
          .select("*")
          .eq("id", appliedCouponId)
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
      
      if (!items || items.length === 0) {
        console.log("Items array is empty, setting discount to 0");
        setCouponDiscount(0);
        return;
      }
      
      const subtotal = getTotalPrice();
      const newDiscount =
        data.discount_type === "percentage"
          ? subtotal * (data.discount_value / 100)
          : Math.min(data.discount_value, subtotal);

      console.log("Calculated coupon discount:", newDiscount, "from subtotal:", subtotal);
      setCouponDiscount(newDiscount);

      if (tax) {
        const afterDiscounts = subtotal - newDiscount - membershipDiscount;
        const newTaxAmount = afterDiscounts * (tax.percentage / 100);
        setTaxAmount(newTaxAmount);
      }
    };

    loadCouponDetails();
  }, [appliedCouponId, getTotalPrice, tax, getCouponById, items, membershipDiscount]);
  
  // Load membership details and calculate discount
  useEffect(() => {
    const loadMembershipDetails = async () => {
      if (!appliedMembershipId) {
        console.log("No membership ID applied");
        setMembership(null);
        setMembershipDiscount(0);
        return;
      }

      console.log("Calculating membership discount for ID:", appliedMembershipId);
      
      const selectedMembership = customerMemberships.find(m => m.membership_id === appliedMembershipId);
      if (selectedMembership && selectedMembership.membership) {
        setMembership(selectedMembership);
        
        // Calculate discount for each item
        let totalDiscount = 0;
        
        for (const item of items) {
          const serviceId = item.service_id || item.service?.id || null;
          const packageId = item.package_id || item.package?.id || null;
          const itemPrice = item.selling_price || item.service?.selling_price || item.package?.price || item.price || 0;
          
          if (serviceId || packageId) {
            const discount = getApplicableMembershipDiscount(serviceId, packageId, itemPrice);
            if (discount) {
              totalDiscount += discount.calculatedDiscount;
              console.log(`Membership discount for ${item.name}: ${discount.calculatedDiscount}`);
            }
          }
        }
        
        console.log("Total membership discount:", totalDiscount);
        setMembershipDiscount(totalDiscount);
        
        // Update tax calculation if needed
        if (tax) {
          const subtotal = getTotalPrice();
          const afterDiscounts = subtotal - couponDiscount - totalDiscount;
          const newTaxAmount = afterDiscounts * (tax.percentage / 100);
          setTaxAmount(newTaxAmount);
        }
      }
    };
    
    loadMembershipDetails();
  }, [appliedMembershipId, items, customerMemberships, getApplicableMembershipDiscount, couponDiscount, getTotalPrice, tax]);

  useEffect(() => {
    if (!selectedDate || !items || items.length === 0 || Object.keys(selectedTimeSlots).length === 0) {
      navigate("/schedule");
    }
  }, [selectedDate, selectedTimeSlots, items, navigate]);

  useEffect(() => {
    if (bookingSuccess) {
      if (confettiRef.current) {
        confettiRef.current.fire();
      }
      
      const end = Date.now() + 5 * 1000;
      const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];

      const frame = () => {
        if (Date.now() > end) return;

        confetti({
          particleCount: 1,
          angle: 60,
          spread: 55,
          startVelocity: 45,
          origin: { x: 0, y: 0.5 },
          colors: colors,
          gravity: 0.7,
          ticks: 300,
        });
        
        confetti({
          particleCount: 1,
          angle: 120,
          spread: 55,
          startVelocity: 45,
          origin: { x: 1, y: 0.5 },
          colors: colors,
          gravity: 0.7,
          ticks: 300,
        });

        setTimeout(() => {
          requestAnimationFrame(frame);
        }, 150);
      };

      frame();
      
      const timer = setTimeout(() => {
        navigate("/profile");
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [bookingSuccess, navigate]);

  if (!items || items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">No items in your cart</h2>
          <p className="text-muted-foreground mb-4">Please add services to continue</p>
          <Button onClick={() => navigate("/services")}>Browse Services</Button>
        </div>
      </div>
    );
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
  const discountedSubtotal = subtotal - couponDiscount - membershipDiscount;
  const totalPrice = discountedSubtotal + taxAmount;

  // Calculate item discounted price including both coupon and membership discounts
  const calculateItemDiscountedPrice = (itemOriginalPrice: number, serviceId: string | null = null, packageId: string | null = null) => {
    let discountedPrice = itemOriginalPrice;
    
    // Apply coupon discount proportionally
    if (couponDiscount > 0 && subtotal > 0) {
      const priceRatio = itemOriginalPrice / subtotal;
      const itemCouponDiscount = couponDiscount * priceRatio;
      discountedPrice -= itemCouponDiscount;
    }
    
    // Apply membership discount if applicable
    if (appliedMembershipId && (serviceId || packageId)) {
      const membershipDiscountResult = getApplicableMembershipDiscount(serviceId, packageId, itemOriginalPrice);
      if (membershipDiscountResult) {
        discountedPrice = Math.max(0, discountedPrice - membershipDiscountResult.calculatedDiscount);
      }
    }
    
    return Math.max(0, discountedPrice);
  };

  const handleCouponSelect = async (couponId: string) => {
    try {
      if (couponId === appliedCouponId) {
        setAppliedCouponId(null);
        setCouponSearchValue("");
        setOpenCouponPopover(false);
        return;
      }

      const selectedCoupon = coupons.find(c => c.id === couponId);
      if (!selectedCoupon) {
        throw new Error("Coupon not found");
      }

      setAppliedCouponId(couponId);
      setCouponSearchValue("");
      setOpenCouponPopover(false);
      toast.success(`Coupon ${selectedCoupon.code} applied!`);
    } catch (error) {
      console.error("Error applying coupon:", error);
      toast.error("Error applying coupon");
    }
  };

  const removeCoupon = () => {
    setAppliedCouponId(null);
    setCoupon(null);
    setCouponDiscount(0);
    toast.success("Coupon removed");
  };
  
  const removeMembership = () => {
    setAppliedMembershipId(null);
    setMembership(null);
    setMembershipDiscount(0);
    toast.success("Membership discount removed");
  };

  const handleBookingConfirmation = async () => {
    setIsLoading(true);
    setBookingError(null);
    
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please login to continue");
        setBookingError("Authentication error. Please login to continue.");
        setIsLoading(false);
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
        membershipDiscount,
        discountedSubtotal,
        taxAmount,
        totalPrice,
        couponId: appliedCouponId,
        membershipId: appliedMembershipId,
        taxId: appliedTaxId,
        couponDetails: coupon,
        membershipDetails: membership?.membership,
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
          location: selectedLocation,
          membership_id: appliedMembershipId,
          membership_discount: membershipDiscount,
          membership_name: membership?.membership?.name || null
        })
        .select();

      if (appointmentError) {
        console.error("Error inserting appointment:", appointmentError);
        toast.error("Failed to create appointment. Please try again.");
        setBookingError("Failed to create your appointment. Please try again.");
        setIsLoading(false);
        throw appointmentError;
      }

      const appointmentId = appointmentData[0].id;

      const bookingPromises = [];

      for (const item of sortedItems) {
        const itemStartTimeString = selectedTimeSlots[item.id];
        if (!itemStartTimeString) {
          console.error(`No start time found for item ${item.id}`);
          continue;
        }
        
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

          const originalPrice = item.selling_price || item.service?.selling_price || 0;
          const discountedPrice = calculateItemDiscountedPrice(originalPrice, item.service_id, null);

          console.log(`Service: ${item.service?.name}, Original: ${originalPrice}, Discounted: ${discountedPrice}`);

          const bookingPromise = supabase.from("bookings").insert({
            appointment_id: appointmentId,
            service_id: item.service_id,
            employee_id: stylistId,
            status: "booked",
            price_paid: discountedPrice,
            original_price: item.service?.original_price || originalPrice,
            start_time: currentStartTime.toISOString(),
            end_time: itemEndTime.toISOString(),
          });

          bookingPromises.push(bookingPromise);
        } else if (item.package_id) {
          if (
            item.package?.package_services &&
            item.package.package_services.length > 0
          ) {
            const packageTotalPrice = item.selling_price || item.package?.price || 0;
            const discountedPackagePrice = calculateItemDiscountedPrice(packageTotalPrice, null, item.package_id);
            const packageDiscountRatio = packageTotalPrice > 0 
              ? discountedPackagePrice / packageTotalPrice 
              : 1;

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
                  
              const adjustedServicePrice = servicePriceInPackage * packageDiscountRatio;

              console.log(`Package Service: ${packageService.service.name}, Original: ${servicePriceInPackage}, Adjusted: ${adjustedServicePrice}`);

              const bookingPromise = supabase.from("bookings").insert({
                appointment_id: appointmentId,
                service_id: packageService.service.id,
                package_id: item.package_id,
                employee_id: stylistId,
                status: "booked",
                price_paid: adjustedServicePrice,
                original_price: servicePriceInPackage,
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

                    const originalCustomPrice = customService.selling_price || 0;
                    const discountedCustomPrice = calculateItemDiscountedPrice(originalCustomPrice, serviceId, null);

                    console.log(`Custom Service: ${customService.name}, Original: ${originalCustomPrice}, Discounted: ${discountedCustomPrice}`);

                    const bookingPromise = supabase.from("bookings").insert({
                      appointment_id: appointmentId,
                      service_id: serviceId,
                      package_id: item.package_id,
                      employee_id: stylistId,
                      status: "confirmed",
                      price_paid: discountedCustomPrice,
                      original_price: originalCustomPrice,
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
      
      setBookingSuccess(true);
      
      setTimeout(() => {
        clearCart();
      }, 5000);
      
    } catch (error: any) {
      console.error("Booking error:", error);
      toast.error(error.message || "Failed to confirm booking");
      setBookingError(error.message || "Failed to confirm your booking. Please try again.");
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    if (!items) return;
    
    for (const item of items) {
      await removeFromCart(item.id);
    }
  };

  const filteredCoupons = couponsLoading
    ? []
    : coupons.filter((coupon) =>
        coupon.code.toLowerCase().includes(couponSearchValue.toLowerCase())
      );

  return (
    <div className="min-h-screen pb-24 relative">
      <Confetti 
        ref={confettiRef}
        className="fixed inset-0 z-[100] pointer-events-none"
        manualstart={true}
        options={{
          particleCount: 100,
          spread: 160,
          origin: { y: 0.3 },
          gravity: 0.7,
          ticks: 400,
        }}
      />
      
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

              const originalPrice = item.selling_price || 
                item.service?.selling_price || 
                item.package?.price || 0;
              const serviceId = item.service_id || item.service?.id || null;
              const packageId = item.package_id || item.package?.id || null;
              const discountedPrice = calculateItemDiscountedPrice(originalPrice, serviceId, packageId);
              const hasDiscount = discountedPrice < originalPrice;

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
                    {hasDiscount ? (
                      <div className="text-right">
                        <span className="text-muted-foreground line-through text-xs mr-1">
                          ₹{originalPrice.toFixed(0)}
                        </span>
                        <span className="text-green-600">₹{discountedPrice.toFixed(0)}</span>
                      </div>
                    ) : (
                      <span>₹{originalPrice.toFixed(0)}</span>
                    )}
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
                
                {/* Membership discount display */}
                {membership && membershipDiscount > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Membership</span>
                      <Badge 
                        variant="outline" 
                        className="px-2 py-1 text-xs flex items-center gap-1 text-blue-600 border-blue-200 bg-blue-50"
                      >
                        {membership.membership?.name}
                        <button 
                          onClick={removeMembership}
                          className="ml-1 rounded-full hover:bg-blue-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm text-blue-600">
                      <span>Membership Discount</span>
                      <span>-₹{membershipDiscount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Coupon</span>
                    
                    {coupon ? (
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className="px-2 py-1 text-xs flex items-center gap-1 text-green-600 border-green-200 bg-green-50"
                        >
                          <Tag className="h-3 w-3" />
                          {coupon.code}
                          <button 
                            onClick={removeCoupon}
                            className="ml-1 rounded-full hover:bg-green-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      </div>
                    ) : (
                      <Popover open={openCouponPopover} onOpenChange={setOpenCouponPopover}>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-xs border-dashed border-muted-foreground/50"
                        >
                          Apply coupon
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-72" align="end">
                        <Command>
                          <CommandInput 
                            placeholder="Search for coupons..." 
                            value={couponSearchValue}
                            onValueChange={setCouponSearchValue}
                          />
                          <CommandList>
                            {couponsLoading ? (
                              <div className="py-6 text-center text-sm">Loading coupons...</div>
                            ) : (
                              <>
                                {filteredCoupons?.length === 0 ? (
                                  <CommandEmpty>No coupons found</CommandEmpty>
                                ) : (
                                  <CommandGroup>
                                    {filteredCoupons.map((c) => (
                                      <CommandItem 
                                        key={c.id} 
                                        value={c.code}
                                        onSelect={() => handleCouponSelect(c.id)}
                                        className="flex justify-between"
                                      >
                                        <div className="flex items-center">
                                          <Tag className="mr-2 h-3 w-3 text-green-600" />
                                          <span>{c.code}</span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                          {c.discount_type === "percentage" 
                                            ? `${c.discount_value}% off` 
                                            : `₹${c.discount_value} off`}
                                        </span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                )}
                              </>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    )}
                  </div>
                  
                  {coupon && couponDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Coupon Discount</span>
                      <span>-₹{couponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

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

      {bookingSuccess && (
        <div className="fixed inset-0 bg-white/95 flex flex-col items-center justify-center z-50">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-2 text-gray-900">Appointment Booked!</h2>
          <p className="text-gray-600">Redirecting to your bookings...</p>
        </div>
      )}

      {bookingError && (
        <div className="fixed inset-0 bg-red-50/95 flex flex-col items-center justify-center z-50">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4">
            <X className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-2 text-gray-900">Booking Failed</h2>
          <p className="text-gray-600 text-center mb-4 max-w-md">{bookingError}</p>
          <Button 
            variant="default"
            onClick={() => setBookingError(null)}
          >
            Try Again
          </Button>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 border-t bg-background">
        <div className="container max-w-2xl mx-auto px-4">
          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="text-2xl font-bold text-foreground">
                ₹{totalPrice.toFixed(2)}
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>{items?.length} services</span>
                <span>•</span>
                <Clock className="h-4 w-4" />
                <span>{durationDisplay}</span>
              </div>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={handleBookingConfirmation}
              disabled={isLoading || bookingSuccess || !!bookingError}
            >
              {isLoading ? "Confirming..." : bookingSuccess ? "Sale Completed" : "Confirm"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
