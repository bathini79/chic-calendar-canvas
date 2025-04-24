import { useCart } from "@/components/cart/CartContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { format, addMinutes } from "date-fns";
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
  Award,
  Coins,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Confetti, type ConfettiRef } from "@/components/ui/confetti";
import confetti from "canvas-confetti";
import { useLoyaltyPoints } from "@/hooks/use-loyalty-points";
import { useLoyaltyInCheckout } from "@/pages/admin/bookings/hooks/useLoyaltyInCheckout";
import { Switch } from "@/components/ui/switch";
import { useMembershipInCheckout } from "@/pages/admin/bookings/hooks/useMembershipInCheckout";
import { useCouponsInCheckout } from "@/pages/admin/bookings/hooks/useCouponsInCheckout";
import { useTaxesInCheckout } from "@/pages/admin/bookings/hooks/useTaxesInCheckout";
import { useSelectedItemsInCheckout } from '@/pages/admin/bookings/hooks/useSelectedItemsInCheckout';
import { usePaymentHandler } from '@/pages/admin/bookings/hooks/usePaymentHandler';
import { useAppointmentNotifications } from "@/hooks/use-appointment-notifications";
import { getAdjustedServicePrices } from "@/pages/admin/bookings/utils/bookingUtils";
import { PackageServiceItem } from "./PackageServiceItem";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

// Add utility functions at the top level
const sendConfirmation = async (appointmentId: string, bookings?: any[]) => {
  try {
    const { data: notificationResult } = await supabase.functions.invoke('send-appointment-notification', {
      body: { appointmentId, type: 'booking_confirmation', bookings }
    });
    return notificationResult;
  } catch (error) {
    console.error("Error sending confirmation:", error);
    // Don't throw the error so the process can continue
    return null;
  }
};

const clearCartItems = async (items: any[], removeFromCart: (id: string) => Promise<void>) => {
  if (!items) return;
  for (const item of items) {
    await removeFromCart(item.id);
  }
};

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
    selectedLocation,
  } = useCart();
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const confettiRef = useRef<ConfettiRef>(null);
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [pointsToEarn, setPointsToEarn] = useState(0);

  // Coupon state
  const [openCouponPopover, setOpenCouponPopover] = useState(false);
  const [couponSearchValue, setCouponSearchValue] = useState("");
  const [filteredCoupons, setFilteredCoupons] = useState<any[]>([]);

  const {
    settings: loyaltySettings,
    walletBalance,
  } = useLoyaltyPoints(customerId);

  const subtotal = items && items.length > 0 ? getTotalPrice() : 0;
  const selectedServicesIds = items?.filter((item) => item.type === "service" && item.service_id)
    .map((item) => item.service_id as string) || [];
  const selectedPackagesIds = items?.filter((item) => item.type === "package" && item.package_id)
    .map((item) => item.package_id as string) || [];
  const allServices = items?.filter((item) => item.type === "service")
    .map((item) => item.service) || [];
  const allPackages = items?.filter((item) => item.type === "package")
    .map((item) => item.package) || [];

  const customerData = useMemo(() => ({
    id: customerId,
    full_name: '', // Required by Customer interface
    email: '',     // Required by Customer interface
    phone: '',     // Required by Customer interface
  }), [customerId]);

  const membership = useMembershipInCheckout({
    selectedCustomer: customerData,
    selectedServices: selectedServicesIds,
    selectedPackages: selectedPackagesIds,
    services: allServices,
    packages: allPackages,
    customizedServices: {},
  });

  const initialDiscountedSubtotal = subtotal - membership.membershipDiscount;

  const loyalty = useLoyaltyInCheckout({
    customerId,
    selectedServices: selectedServicesIds,
    selectedPackages: selectedPackagesIds,
    services: allServices,
    packages: allPackages,
    subtotal,
    discountedSubtotal: initialDiscountedSubtotal,
  });

  const coupons = useCouponsInCheckout({
    subtotal: subtotal - membership.membershipDiscount
  });

  const handleCouponSelect = (couponId: string) => {
    if (couponId === coupons.selectedCouponId) {
      coupons.handleCouponChange("");
      return;
    }
    coupons.handleCouponChange(couponId);
    setOpenCouponPopover(false);
  };

  useEffect(() => {
    if (coupons.availableCoupons) {
      setFilteredCoupons(
        coupons.availableCoupons.filter((c) =>
          c.code.toLowerCase().includes(couponSearchValue.toLowerCase())
        )
      );
    }
  }, [couponSearchValue, coupons.availableCoupons]);

  const taxes = useTaxesInCheckout({
    locationId: selectedLocation,
    // Calculate tax on amount after membership and coupon discounts, but before loyalty points
    discountedSubtotal: subtotal - membership.membershipDiscount - coupons.couponDiscount
  });

  const { selectedItems } = useSelectedItemsInCheckout({
    selectedServices: selectedServicesIds,
    selectedPackages: selectedPackagesIds,
    services: allServices,
    packages: allPackages,
    selectedStylists,
    selectedTimeSlots,
    customizedServices: {},
    getServiceDisplayPrice: (serviceId) => {
      const service = allServices.find(s => s.id === serviceId);
      return service?.selling_price || 0;
    },
    getStylistName: (stylistId) => stylistId,
    formatDuration: (minutes) => {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return hours > 0
        ? `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ""}`
        : `${remainingMinutes}m`;
    }
  });

  // Calculate adjusted prices based on discounts
  const adjustedPrices = useMemo(() => {
    return getAdjustedServicePrices(
      selectedServicesIds,
      selectedPackagesIds,
      allServices,
      allPackages,
      {}, // No customized services
      "none", // No manual discount type
      0,      // No manual discount value
      membership.membershipDiscount,
      coupons.couponDiscount,
      0 // Don't include loyalty points in individual price adjustments
    );
  }, [
    selectedServicesIds,
    selectedPackagesIds,
    allServices,
    allPackages,
    membership.membershipDiscount,
    coupons.couponDiscount
  ]);

  const finalPrice = useMemo(() => {
    const discountedSubtotal = subtotal - membership.membershipDiscount - coupons.couponDiscount;
    // Add tax before subtracting loyalty points discount
    const afterTax = discountedSubtotal + taxes.taxAmount;
    // Subtract loyalty points discount last
    return Math.max(0, afterTax - loyalty.pointsDiscountAmount);
  }, [subtotal, membership.membershipDiscount, coupons.couponDiscount, taxes.taxAmount, loyalty.pointsDiscountAmount]);

  // Add roundedTotal calculation
  const roundedTotal = useMemo(() => {
    return Math.round(finalPrice);
  }, [finalPrice]);

  // Add roundOffDifference calculation
  const roundOffDifference = useMemo(() => {
    return roundedTotal - finalPrice;
  }, [roundedTotal, finalPrice]);

  const { handlePayment } = usePaymentHandler({
    selectedCustomer: customerData,  // Use the same customerData with all required fields
    paymentMethod: "cash",
    appointmentId: null,
    taxes: {
      appliedTaxId: taxes.appliedTaxId,
      taxAmount: taxes.taxAmount,
    },
    coupons: {
      selectedCouponId: coupons.selectedCouponId,
      couponDiscount: coupons.couponDiscount,
      availableCoupons: coupons.availableCoupons,
    },
    membership: {
      membershipId: membership.membershipId,
      membershipName: membership.membershipName,
      membershipDiscount: membership.membershipDiscount,
    },
    loyalty: {
      adjustedServicePrices: loyalty.adjustedServicePrices,
      pointsToEarn: loyalty.pointsToEarn,
      pointsToRedeem: loyalty.pointsToRedeem,
      pointsDiscountAmount: loyalty.pointsDiscountAmount,
    },
    total: finalPrice,
    adjustedPrices: {},
    onPaymentComplete: async (appointmentId) => {
      if (loyalty.pointsToRedeem > 0) {
        const currentDate = new Date();
        const updatedWalletBalance = Math.max(
          0,
          walletBalance - loyalty.pointsToRedeem
        );

        await supabase
          .from("profiles")
          .update({
            wallet_balance: updatedWalletBalance,
            last_used: currentDate.toISOString(),
          })
          .eq("id", customerId);
      }

      // Get the bookings for the appointment to pass to sendConfirmation
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*, services(*), packages(*), employees!bookings_employee_id_fkey(*)")
        .eq("appointment_id", appointmentId);

      try {
        // Pass the bookings data to sendConfirmation
        await sendConfirmation(appointmentId, bookingsData);
      } catch (notificationError) {
        console.error("Error sending confirmation:", notificationError);
        // Error handling is already in sendConfirmation, but this is an extra safety
      }

      toast.success("Booking confirmed successfully!");
      setBookingSuccess(true);
      setTimeout(() => clearCartItems(items, removeFromCart), 5000);
    },
    onSaveAppointment: async (params) => {
      try {
        // Check if we have a valid selected date
        if (!selectedDate) {
          throw new Error("No date selected for booking");
        }
        
        // Find a valid time to use - try various sources in order of priority
        let timeToUse: string | undefined;
        
        // 1. If there's a selectedTime in params, use it
        if (params?.selectedTime && typeof params.selectedTime === 'string') {
          timeToUse = params.selectedTime;
        } 
        // 2. Otherwise, try to use the first time slot from selectedTimeSlots
        else if (Object.values(selectedTimeSlots).length > 0) {
          timeToUse = Object.values(selectedTimeSlots)[0];
        }
        // 3. If we still don't have a time, check if we have a time in sorted items
        else if (sortedItems.length > 0 && selectedTimeSlots[sortedItems[0]?.id]) {
          timeToUse = selectedTimeSlots[sortedItems[0]?.id];
        }
        // 4. Last resort - use a default time if everything else fails
        else {
          // Use a default opening time like 9:00 AM
          timeToUse = "09:00";
          console.warn("Using default time 09:00 as no time slot was found");
        }
        
        // Validate time format before creating date
        if (typeof timeToUse !== 'string') {
          
          throw new Error(`Invalid time format: ${JSON.stringify(timeToUse)}`);
        }

        const startDateTime = new Date(
          `${format(selectedDate, "yyyy-MM-dd")} ${timeToUse}`
        );
        
        // Check if date is valid before proceeding
        if (isNaN(startDateTime.getTime())) {
          throw new Error(`Invalid date created from: ${format(selectedDate, "yyyy-MM-dd")} ${timeToUse}`);
        }
        
        const endDateTime = addMinutes(startDateTime, totalDuration);

        const { data: appointmentData, error: appointmentError } = await supabase
          .from("appointments")
          .insert({
            customer_id: customerId,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            notes: notes,
            status: "booked",
            number_of_bookings: items.length,
            total_price: roundedTotal,
            round_off_difference: roundOffDifference,
            total_duration: totalDuration,
            tax_amount: taxes.taxAmount,
            tax_id: taxes.appliedTaxId,
            coupon_id: coupons.selectedCouponId,
            discount_type: coupons.selectedCoupon?.discount_type || null,
            discount_value: coupons.selectedCoupon?.discount_value || 0,
            location: selectedLocation,
            membership_id: membership.membershipId || null,
            membership_name: membership.membershipName || null,
            membership_discount: membership.membershipDiscount || 0,
            points_earned: loyalty.pointsToEarn,
            points_redeemed: loyalty.pointsToRedeem,
            points_discount_amount: loyalty.pointsDiscountAmount,
          })
          .select();

        if (appointmentError) throw appointmentError;

        const appointmentId = appointmentData[0].id;
        const bookingPromises = [];
        
        // Debugging helper function to validate time
        const validateTime = (timeString) => {
          return typeof timeString === 'string' && /^\d{1,2}:\d{2}$/.test(timeString);
        };
        
        const createBookingTimeObject = (timeString) => {
          if (!validateTime(timeString)) {
            console.log("ll");

            console.warn(`Invalid time format: ${timeString}, using fallback time`);
            return null;
          }
          
          const dateTimeObj = new Date(`${format(selectedDate, "yyyy-MM-dd")} ${timeString}`);
          if (isNaN(dateTimeObj.getTime())) {
            console.warn(`Invalid date created from: ${format(selectedDate, "yyyy-MM-dd")} ${timeString}`);
            return null;
          }
          
          return dateTimeObj;
        };

        for (const item of selectedItems) {
          if (item.type === "service") {
            // Make sure we have a valid time slot before creating booking
            let timeSlot = null;
            let startTimeObj = null;
            
            // First try to get time slot by item.id (cart item ID)
            if (validateTime(selectedTimeSlots[item.id])) {
              timeSlot = selectedTimeSlots[item.id];
            } 
            // Then try service_id if available
            else if (item.service_id && validateTime(selectedTimeSlots[item.service_id])) {
              timeSlot = selectedTimeSlots[item.service_id];
            } 
            // Fallback to first available time slot
            else if (firstStartTime) {
              timeSlot = firstStartTime;
            }
            
            if (timeSlot) {
              startTimeObj = createBookingTimeObject(timeSlot);
            }
            
            if (startTimeObj) {
              const endTimeObj = addMinutes(startTimeObj, item.duration);
              
              bookingPromises.push(
                supabase.from("bookings").insert({
                  appointment_id: appointmentId,
                  service_id: item.id,
                  // Convert "any" to null for employee_id
                  employee_id: selectedStylists[item.id] === "any" ? null : selectedStylists[item.id],
                  status: "booked",
                  // Use the correctly calculated adjusted price from adjustedPrices
                  price_paid: adjustedPrices[item.id] !== undefined 
                    ? adjustedPrices[item.id] 
                    : (item.selling_price || item.price || 0),
                  original_price: item.selling_price || item.price || 0,
                  start_time: startTimeObj.toISOString(),
                  end_time: endTimeObj.toISOString(),
                })
              );
            } else {
              console.error(`Could not create valid booking time for service ${item.id}`);
            }
          } else if (item.type === "package") {
            for (const service of item.services) {
              // Make sure we have a valid time slot for the service before creating booking
              let timeSlot = null;
              let startTimeObj = null;
              
              // Try each possible time slot source in order of preference
              if (validateTime(selectedTimeSlots[service.id])) {
                timeSlot = selectedTimeSlots[service.id];
              } else if (validateTime(selectedTimeSlots[item.id])) {
                timeSlot = selectedTimeSlots[item.id];
              } else if (validateTime(Object.values(selectedTimeSlots)[0])) {
                timeSlot = Object.values(selectedTimeSlots)[0];
              } else if (validateTime(firstStartTime)) {
                timeSlot = firstStartTime;
              }
              
              // Create the date object if we have a valid time
              if (timeSlot) {
                startTimeObj = createBookingTimeObject(timeSlot);
              }
              
              if (startTimeObj) {
                const endTimeObj = addMinutes(startTimeObj, service.duration || 0);
                
                bookingPromises.push(
                  supabase.from("bookings").insert({
                    appointment_id: appointmentId,
                    service_id: service.id,
                    package_id: item.id,
                    employee_id: selectedStylists[service.id] === "any" ? null : 
                               (selectedStylists[service.id] || 
                               (selectedStylists[item.id] === "any" ? null : selectedStylists[item.id]) || 
                               null),
                    status: "booked",
                    // Use the properly calculated adjusted price for package services
                    price_paid: adjustedPrices[service.id] !== undefined 
                      ? adjustedPrices[service.id] 
                      : (service.package_selling_price || service.selling_price || service.price || 0),
                    original_price: service.package_selling_price || service.selling_price || service.price || 0,
                    start_time: startTimeObj.toISOString(),
                    end_time: endTimeObj.toISOString(),
                  })
                );
              } else {
                console.error(`Could not create valid booking time for package service ${service.id} in package ${item.id}`);
              }
            }
          }
        }

        await Promise.all(bookingPromises);
        return appointmentId;
      } catch (error) {
        console.error("Error saving appointment:", error);
        toast.error(error.message || "Failed to save appointment");
        return null;
      }
    }
  });

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setCustomerId(session.user.id);
      }
    };

    getCurrentUser();
  }, []);

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
          <p className="text-muted-foreground mb-4">
            Please add services to continue
          </p>
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

      await handlePayment();
    } catch (error: any) {
      console.error("Booking error:", error);
      toast.error(error.message || "Failed to confirm booking");
      setBookingError(
        error.message || "Failed to confirm your booking. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

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

              const serviceId = item.service_id || (item.service?.id || "");
              const packageId = item.package_id || (item.package?.id || "");
              
              const originalPrice =
                item.selling_price ||
                item.service?.selling_price ||
                item.package?.price ||
                0;
              
              // Get the adjusted price based on discounts
              let discountedPrice = serviceId 
                ? adjustedPrices[serviceId] || originalPrice 
                : packageId
                ? adjustedPrices[packageId] || originalPrice
                : originalPrice;
              
              let hasDiscount = discountedPrice < originalPrice;
              
              // For packages, we need to collect the included services
              let packageServices = [];
              if (item.type === "package" || item.package) {
                // Get services in this package
                const packageData = item.package || {};
                if (packageData.package_services) {
                  // Handle standard package structure with package_services array
                  packageServices = packageData.package_services.map(ps => {
                    const basePrice = ps.package_selling_price !== null && ps.package_selling_price !== undefined
                      ? ps.package_selling_price
                      : ps.service.selling_price;
                    
                    return {
                      id: ps.service.id,
                      name: ps.service.name,
                      price: basePrice,
                      adjustedPrice: adjustedPrices[ps.service.id] || basePrice,
                      duration: ps.service.duration,
                      stylistName: selectedStylists[ps.service.id] || null,
                      time: selectedTimeSlots[ps.service.id] || null,
                    };
                  });
                } else if (packageData.services) {
                  // Package has inline services
                  packageServices = packageData.services.map(svc => ({
                    id: svc.id,
                    name: svc.name,
                    price: svc.selling_price || 0,
                    adjustedPrice: adjustedPrices[svc.id] || svc.selling_price || 0,
                    duration: svc.duration || 0,
                    stylistName: selectedStylists[svc.id] || null,
                    time: selectedTimeSlots[svc.id] || null,
                  }));
                } else if (allServices.length > 0 && packageId) {
                  // Find services that belong to this package
                  const packageServiceIds = allServices
                    .filter(s => s.package_id === packageId)
                    .map(s => s.id);
                    
                  // For each service ID, find the corresponding service
                  packageServices = packageServiceIds.map(svcId => {
                    const svc = allServices.find(s => s.id === svcId);
                    if (!svc) return null;
                    return {
                      id: svc.id,
                      name: svc.name,
                      price: svc.selling_price || 0,
                      adjustedPrice: adjustedPrices[svc.id] || svc.selling_price || 0,
                      duration: svc.duration || 0,
                      stylistName: selectedStylists[svc.id] || null,
                      time: selectedTimeSlots[svc.id] || null,
                    };
                  }).filter(Boolean);
                }
                
                // If this is a package, we need to recalculate the discountedPrice 
                // as the sum of the adjusted prices of its services
                if (packageId) {
                  discountedPrice = packageServices.reduce((sum, service) => {
                    return sum + (service.adjustedPrice || service.price);
                  }, 0);
                  
                  // If there are additional customized services, we need to include them too
                  // (not implemented in this version, but would follow a similar pattern)
                  
                  hasDiscount = discountedPrice < originalPrice;
                }
              }
              
              const isPackage = item.type === "package" || item.package;

              return (
                <div
                  key={item.id}
                  className="flex flex-col py-4 border-b"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium">
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
                            ₹{originalPrice.toFixed(2)}
                          </span>
                          <span className="text-green-600">
                            ₹{discountedPrice.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span>₹{originalPrice.toFixed(2)}</span>
                      )}
                    </div>
                  </div>

                  {/* Display package services in an accordion if this is a package */}
                  {isPackage && packageServices.length > 0 && (
                    <Accordion type="single" collapsible className="mt-2">
                      <AccordionItem value="package-details" className="border-none">
                        <AccordionTrigger className="text-sm font-medium text-muted-foreground hover:text-primary py-2 px-0">
                          View Package Details
                        </AccordionTrigger>
                        <AccordionContent className="mt-2 space-y-4 bg-gray-50 rounded-md p-4 border border-gray-200">
                          {packageServices.map((service) => (
                            <PackageServiceItem 
                              key={service.id} 
                              service={service} 
                            />
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
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

                {membership.membershipDiscount > 0 && membership.membershipName && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      Membership ({membership.membershipName})
                    </span>
                    <span>-₹{membership.membershipDiscount.toFixed(2)}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Coupon
                    </span>

                    {coupons.selectedCouponId ? (
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="px-2 py-1 text-xs flex items-center gap-1 text-green-600 border-green-200 bg-green-50"
                        >
                          <Tag className="h-3 w-3" />
                          {coupons.selectedCoupon?.code}
                          <button
                            onClick={() => coupons.handleCouponChange("")}
                            className="ml-1 rounded-full hover:bg-green-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      </div>
                    ) : (
                      <Popover
                        open={openCouponPopover}
                        onOpenChange={setOpenCouponPopover}
                      >
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
                              {coupons.isLoadingCoupons ? (
                                <div className="py-6 text-center text-sm">
                                  Loading coupons...
                                </div>
                              ) : (
                                <>
                                  {filteredCoupons.length === 0 ? (
                                    <CommandEmpty>
                                      No coupons found
                                    </CommandEmpty>
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

                  {coupons.selectedCouponId && coupons.couponDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-₹{coupons.couponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {taxes.appliedTaxId && taxes.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {taxes.appliedTaxName} ({taxes.appliedTaxRate}%)
                    </span>
                    <span>₹{taxes.taxAmount.toFixed(2)}</span>
                  </div>
                )}

                {loyaltySettings?.enabled && customerId && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm items-center">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Coins className="h-4 w-4" /> Current Points
                      </span>
                      <span className="font-medium">{walletBalance || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm items-center">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Coins className="h-4 w-4" /> Points You'll Earn
                      </span>
                      <span className="font-semibold text-yellow-600">{loyalty.pointsToEarn}</span>
                    </div>
                    {loyalty.walletBalance > 0 && loyalty.maxPointsToRedeem > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <label
                          htmlFor="use-loyalty-points"
                          className="flex items-center gap-2 text-muted-foreground"
                        >
                          <Award className="h-4 w-4 text-green-500" /> Use Points
                        </label>
                        <input
                          id="use-loyalty-points"
                          type="checkbox"
                          checked={loyalty.usePoints}
                          onChange={(e) => loyalty.setUsePoints(e.target.checked)}
                          className="h-4 w-4 text-green-500 focus:ring-green-500"
                        />
                      </div>
                    )}
                  </div>
                )}

                {loyalty.pointsDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      Loyalty Points Discount
                    </span>
                    <span>-₹{loyalty.pointsDiscountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Round Off</span>
                  <span>{roundOffDifference > 0 ? `+₹${roundOffDifference.toFixed(2)}` : `₹${roundOffDifference.toFixed(2)}`}</span>
                </div>

                <div className="flex justify-between text-base font-medium pt-1 border-t">
                  <span>Total</span>
                  <span>₹{roundedTotal.toFixed(2)}</span>
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
          <h2 className="text-3xl font-bold mb-2 text-gray-900">
            Appointment Booked!
          </h2>
          <p className="text-gray-600">Redirecting to your bookings...</p>
        </div>
      )}

      {bookingError && (
        <div className="fixed inset-0 bg-red-50/95 flex flex-col items-center justify-center z-50">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4">
            <X className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-2 text-gray-900">
            Booking Failed
          </h2>
          {bookingError}
          <Button variant="default" onClick={() => setBookingError(null)}>
            Try Again
          </Button>
          <h4>or reach to the Salon employee </h4>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 border-t bg-background">
        <div className="container max-w-2xl mx-auto px-4">
          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="text-2xl font-bold text-foreground">
                ₹{roundedTotal.toFixed(2)}
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
              {isLoading
                ? "Confirming..."
                : bookingSuccess
                ? "Sale Completed"
                : "Confirm"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
