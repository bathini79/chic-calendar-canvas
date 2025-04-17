
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
  Award,
  Coins
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useLocationTaxSettings } from "@/hooks/use-location-tax-settings";
import { useCoupons } from "@/hooks/use-coupons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Confetti, type ConfettiRef } from "@/components/ui/confetti";
import confetti from "canvas-confetti";
import { useCustomerMemberships } from "@/hooks/use-customer-memberships";
import { useAppointmentNotifications } from "@/hooks/use-appointment-notifications";
import { useLoyaltyPoints } from "@/hooks/use-loyalty-points";
import { useLoyaltyInCheckout } from "@/pages/admin/bookings/hooks/useLoyaltyInCheckout";
import { Switch } from "@/components/ui/switch";

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
  const [taxAmount, setTaxAmount] = useState(0);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [tax, setTax] = useState(null);
  const [coupon, setCoupon] = useState(null);
  const [locationDetails, setLocationDetails] = useState(null);
  const { fetchLocationTaxSettings, fetchTaxDetails } = useLocationTaxSettings();
  const { coupons, isLoading: couponsLoading, validateCouponCode, getCouponById } = useCoupons();
  const [couponSearchValue, setCouponSearchValue] = useState("");
  const [openCouponPopover, setOpenCouponPopover] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const confettiRef = useRef<ConfettiRef>(null);
  const { customerMemberships, fetchCustomerMemberships, getApplicableMembershipDiscount } = useCustomerMemberships();
  const [membershipDiscount, setMembershipDiscount] = useState(0);
  const [activeMembership, setActiveMembership] = useState<any>(null);
  const [hasFetchedMemberships, setHasFetchedMemberships] = useState(false);
  const { sendNotification } = useAppointmentNotifications();
  
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [pointsToEarn, setPointsToEarn] = useState(0);
  
  // State for loyalty points handling
  const [usePointsForDiscount, setUsePointsForDiscount] = useState(true);
  
  const { 
    settings: loyaltySettings, 
    customerPoints,
    isLoading: loyaltyLoading,
    fetchCustomerPoints,
    getEligibleAmount,
    calculatePointsFromAmount,
    walletBalance
  } = useLoyaltyPoints(customerId);

  // Use the loyalty checkout hook
  const subtotal = items && items.length > 0 ? getTotalPrice() : 0;
  const selectedServicesIds = items
    ?.filter(item => item.type === 'service' && item.service_id)
    .map(item => item.service_id as string) || [];
    
  const selectedPackagesIds = items
    ?.filter(item => item.type === 'package' && item.package_id)
    .map(item => item.package_id as string) || [];
    
  const allServices = items?.filter(item => item.type === 'service').map(item => item.service) || [];
  const allPackages = items?.filter(item => item.type === 'package').map(item => item.package) || [];
  
  const loyalty = useLoyaltyInCheckout({
    customerId,
    selectedServices: selectedServicesIds,
    selectedPackages: selectedPackagesIds,
    services: allServices,
    packages: allPackages,
    subtotal,
    discountedSubtotal: subtotal - membershipDiscount - couponDiscount
  });

  // Set initial points to redeem
  useEffect(() => {
    if (loyalty.maxPointsToRedeem > 0 && usePointsForDiscount) {
      loyalty.setPointsToRedeem(loyalty.maxPointsToRedeem);
    } else {
      loyalty.setPointsToRedeem(0);
    }
  }, [loyalty.maxPointsToRedeem, usePointsForDiscount]);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setCustomerId(session.user.id);
      }
    };
    
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!loyaltySettings?.enabled || !items || items.length === 0 || !customerId) {
      setPointsToEarn(0);
      return;
    }

    try {
      const selectedServices = items
        .filter(item => item.type === 'service' && item.service_id)
        .map(item => item.service_id as string);
      
      const selectedPackages = items
        .filter(item => item.type === 'package' && item.package_id)
        .map(item => item.package_id as string);
      
      const subtotal = getTotalPrice();
      const eligibleAmount = getEligibleAmount(
        selectedServices,
        selectedPackages,
        items.filter(item => item.type === 'service').map(item => item.service),
        items.filter(item => item.type === 'package').map(item => item.package),
        subtotal
      );
      
      const afterMembershipDiscount = eligibleAmount - 
        (eligibleAmount / subtotal) * membershipDiscount;
      
      const afterCouponDiscount = afterMembershipDiscount - 
        (afterMembershipDiscount / (subtotal - membershipDiscount)) * couponDiscount;
      
      // Also consider the loyalty points discount when calculating points to earn
      const afterLoyaltyDiscount = usePointsForDiscount && loyalty.pointsDiscountAmount > 0
        ? afterCouponDiscount - 
          (afterCouponDiscount / (subtotal - membershipDiscount - couponDiscount)) * loyalty.pointsDiscountAmount
        : afterCouponDiscount;
      
      const calculatedPoints = calculatePointsFromAmount(afterLoyaltyDiscount);
      setPointsToEarn(calculatedPoints);
      
    } catch (error) {
      console.error("Error calculating points to earn:", error);
      setPointsToEarn(0);
    }
  }, [
    loyaltySettings, 
    items, 
    customerId, 
    membershipDiscount, 
    couponDiscount, 
    loyalty.pointsDiscountAmount,
    usePointsForDiscount,
    getTotalPrice, 
    getEligibleAmount, 
    calculatePointsFromAmount
  ]);

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
    const loadMemberships = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !hasFetchedMemberships) {
        await fetchCustomerMemberships(session.user.id);
        setHasFetchedMemberships(true);
      }
    };

    loadMemberships();
  }, [fetchCustomerMemberships, hasFetchedMemberships]);

  useEffect(() => {
    if (items && items.length > 0 && customerMemberships.length > 0) {
      let totalMembershipDiscount = 0;
      let bestMembership = null;
      
      items.forEach(item => {
        if (item.type === 'service' && item.service_id) {
          const servicePrice = item.selling_price || item.service?.selling_price || 0;
          const discountInfo = getApplicableMembershipDiscount(item.service_id, null, servicePrice);
          if (discountInfo && discountInfo.calculatedDiscount > 0) {
            totalMembershipDiscount += discountInfo.calculatedDiscount;
            if (!bestMembership) {
              bestMembership = {
                id: discountInfo.membershipId,
                name: discountInfo.membershipName,
              };
            }
          }
        } else if (item.type === 'package' && item.package_id) {
          const packagePrice = item.selling_price || item.package?.price || 0;
          const discountInfo = getApplicableMembershipDiscount(null, item.package_id, packagePrice);
          
          if (discountInfo && discountInfo.calculatedDiscount > 0) {
            totalMembershipDiscount += discountInfo.calculatedDiscount;
            if (!bestMembership) {
              bestMembership = {
                id: discountInfo.membershipId,
                name: discountInfo.membershipName,
              };
            }
          }
        }
      });
      
      setMembershipDiscount(totalMembershipDiscount);
      setActiveMembership(bestMembership);
      
    } else {
      setMembershipDiscount(0);
      setActiveMembership(null);
    }
  }, [items, customerMemberships, getApplicableMembershipDiscount]);

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
            const afterMembershipDiscount = subtotal - membershipDiscount;
            
            // Include loyalty discount when calculating tax
            const afterCouponAndMembership = afterMembershipDiscount - couponDiscount;
            const afterAllDiscounts = usePointsForDiscount ? 
              afterCouponAndMembership - loyalty.pointsDiscountAmount : 
              afterCouponAndMembership;
              
            const newTaxAmount = afterAllDiscounts * (taxData.percentage / 100);
            setTaxAmount(newTaxAmount);
          }
        } catch (error) {
          console.error("Error loading tax details:", error);
        }
      }
    };

    loadTaxDetails();
  }, [
    appliedTaxId, 
    couponDiscount, 
    getTotalPrice, 
    fetchTaxDetails, 
    items, 
    tax, 
    membershipDiscount, 
    usePointsForDiscount, 
    loyalty.pointsDiscountAmount
  ]);

  useEffect(() => {
    const loadCouponDetails = async () => {
      if (!appliedCouponId) {
        setCoupon(null);
        setCouponDiscount(0);
        return;
      }

      try {
        const couponData = await getCouponById(appliedCouponId);
        if (couponData) {
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
          processCouponData(data);
        }
      } catch (error: any) {
        console.error("Error in loadCouponDetails:", error);
        setCoupon(null);
        setCouponDiscount(0);
      }
    };

    const processCouponData = (data: any) => {
      setCoupon((prevCoupon) => {
        if (prevCoupon?.id === data.id) return prevCoupon; // Prevent unnecessary updates
        return data;
      });

      if (!items || items.length === 0) {
        setCouponDiscount(0);
        return;
      }

      const subtotal = getTotalPrice();
      const afterMembershipDiscount = subtotal - membershipDiscount;
      const newDiscount =
        data.discount_type === "percentage"
          ? afterMembershipDiscount * (data.discount_value / 100)
          : Math.min(data.discount_value, afterMembershipDiscount);

      setCouponDiscount(newDiscount);

      if (tax) {
        const afterAllDiscounts = 
          subtotal - 
          membershipDiscount - 
          newDiscount - 
          (usePointsForDiscount ? loyalty.pointsDiscountAmount : 0);
          
        const newTaxAmount = afterAllDiscounts * (tax.percentage / 100);
        setTaxAmount(newTaxAmount);
      }
    };

    loadCouponDetails();
  }, [
    appliedCouponId, 
    getTotalPrice, 
    tax, 
    getCouponById, 
    items, 
    membershipDiscount, 
    usePointsForDiscount, 
    loyalty.pointsDiscountAmount
  ]);

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

  const subtotalAmount = getTotalPrice();
  const afterMembershipDiscount = subtotalAmount - membershipDiscount;
  const afterCouponDiscount = afterMembershipDiscount - couponDiscount;
  
  // Include loyalty points discount in the calculation
  const pointsDiscount = usePointsForDiscount ? loyalty.pointsDiscountAmount : 0;
  const discountedSubtotal = afterCouponDiscount - pointsDiscount;
  const totalPrice = discountedSubtotal + taxAmount;

  const calculateItemDiscountedPrice = (itemOriginalPrice: number, serviceId: string | undefined, packageId: string | undefined) => {
    if ((membershipDiscount <= 0 && couponDiscount <= 0 && pointsDiscount <= 0) || subtotalAmount <= 0) {
      return itemOriginalPrice;
    }
    
    let itemMembershipDiscount = 0;
    if ((serviceId || packageId) && membershipDiscount > 0) {
      const discountInfo = getApplicableMembershipDiscount(
        serviceId || null, 
        packageId || null, 
        itemOriginalPrice
      );
      
      if (discountInfo) {
        itemMembershipDiscount = discountInfo.calculatedDiscount;
      }
    }
    
    const afterMembershipPrice = Math.max(0, itemOriginalPrice - itemMembershipDiscount);
    
    // Apply coupon discount proportionally
    let afterCouponPrice = afterMembershipPrice;
    if (couponDiscount > 0 && afterMembershipDiscount > 0) {
      const priceRatio = afterMembershipPrice / afterMembershipDiscount;
      const itemCouponDiscount = couponDiscount * priceRatio;
      afterCouponPrice = Math.max(0, afterMembershipPrice - itemCouponDiscount);
    }
    
    // Apply loyalty points discount proportionally
    if (pointsDiscount > 0 && afterCouponDiscount > 0 && usePointsForDiscount) {
      const priceRatio = afterCouponPrice / afterCouponDiscount;
      const itemPointsDiscount = pointsDiscount * priceRatio;
      return Math.max(0, afterCouponPrice - itemPointsDiscount);
    }
    
    return afterCouponPrice;
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
      
      // Include loyalty points information in the appointment
      const pointsToUse = usePointsForDiscount ? loyalty.pointsToRedeem : 0;
      const loyaltyDiscountAmount = usePointsForDiscount ? loyalty.pointsDiscountAmount : 0;
      
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
          membership_id: activeMembership?.id || null,
          membership_name: activeMembership?.name || null,
          membership_discount: membershipDiscount || 0,
          points_earned: pointsToEarn,
          points_redeemed: pointsToUse,
          points_discount_amount: loyaltyDiscountAmount
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
                    const discountedCustomPrice = calculateItemDiscountedPrice(originalCustomPrice, serviceId, item.package_id);
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
      
      // Update loyalty points in the profile if points were redeemed
      if (usePointsForDiscount && loyalty.pointsToRedeem > 0) {
        const currentDate = new Date();
        const updatedWalletBalance = Math.max(0, walletBalance - loyalty.pointsToRedeem);
        
        const { error: pointsError } = await supabase
          .from("profiles")
          .update({
            wallet_balance: updatedWalletBalance,
            last_used: currentDate.toISOString()
          })
          .eq("id", customer_id);
          
        if (pointsError) {
          console.error("Error updating loyalty points:", pointsError);
          // Don't fail the booking if points update fails
        }
      }
      
      try {
        const notificationResult = await sendConfirmation(
          appointmentId,
          sendNotification
        );
      } catch (notificationError) {
        console.error("Error sending confirmation:", notificationError);
        // Don't fail the booking if notification fails
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
              const discountedPrice = calculateItemDiscountedPrice(
                originalPrice, 
                item.service_id, 
                item.package_id
              );
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
                  <span>₹{subtotalAmount.toFixed(2)}</span>
                </div>
                
                {activeMembership && membershipDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      Membership ({activeMembership.name})
                    </span>
                    <span>-₹{membershipDiscount.toFixed(2)}</span>
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
                      <span>Discount</span>
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

                {loyaltySettings?.enabled && customerId && (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Coins className="h-4 w-4" />
                        Current Points
                      </span>
                      <span className="font-medium">{walletBalance || 0}</span>
                    </div>
                    
                    {loyalty.walletBalance > 0 && loyalty.maxPointsToRedeem > 0 && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={usePointsForDiscount}
                            onCheckedChange={setUsePointsForDiscount}
                            id="use-points"
                          />
                          <label
                            htmlFor="use-points"
                            className="text-sm cursor-pointer"
                          >
                            Use {loyalty.pointsToRedeem} points
                          </label>
                        </div>
                        
                        {usePointsForDiscount && loyalty.pointsDiscountAmount > 0 && (
                          <span className="text-sm text-green-600">
                            -₹{loyalty.pointsDiscountAmount.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {pointsToEarn > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span className="flex items-center gap-1">
                          <Coins className="h-4 w-4" />
                          Points You'll Earn
                        </span>
                        <span>+{pointsToEarn}</span>
                      </div>
                    )}
                  </>
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
          {bookingError}
          <Button 
            variant="default"
            onClick={() => setBookingError(null)}
          >
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


const sendConfirmation = async (
  appointmentId: string,
  sendNotification: (appointmentId: string, type: string) => Promise<any>
) => {
  try {
    if (sendNotification) {
      return await sendNotification(appointmentId, "booking_confirmation");
    }
    return null;
  } catch (error) {
    console.error("Error sending confirmation:", error);
    // Don't show error to user since this is a background task
    return null;
  }
};

