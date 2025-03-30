import React, { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  MoreVertical, 
  IndianRupee, 
  Percent, 
  Clock,
  User,
  Plus,
  ArrowLeft,
  Trash2,
  Award,
  X,
  Check,
  XCircle,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import type { Service, Package, Customer, AppointmentStatus, PaymentMethod, DiscountType } from "../types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  getTotalPrice, 
  getTotalDuration, 
  getFinalPrice, 
  calculatePackagePrice,
  getAdjustedServicePrices,
} from "../utils/bookingUtils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTaxRates } from "@/hooks/use-tax-rates";
import { useLocationTaxSettings } from "@/hooks/use-location-tax-settings";
import { LoaderCircle } from "lucide-react";
import { StatusBadge, getStatusBackgroundColor } from "./StatusBadge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CheckoutSectionProps {
  appointmentId?: string;
  selectedCustomer: Customer | null;
  selectedServices: string[];
  selectedPackages: string[];
  services: Service[];
  packages: Package[];
  discountType: DiscountType;
  discountValue: number;
  paymentMethod: PaymentMethod;
  notes: string;
  onDiscountTypeChange: (type: DiscountType) => void;
  onDiscountValueChange: (value: number) => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onNotesChange: (notes: string) => void;
  onPaymentComplete: (appointmentId?: string) => void;
  selectedStylists: Record<string, string>;
  selectedTimeSlots: Record<string, string>;
  onSaveAppointment: (params?: any) => Promise<string | null>;
  onRemoveService: (serviceId: string) => void;
  onRemovePackage: (packageId: string) => void;
  onBackToServices: () => void;
  isExistingAppointment?: boolean;
  customizedServices?: Record<string, string[]>;
  locationId?: string;
  appointmentStatus?: AppointmentStatus;
  onCancelAppointment?: () => void;
  onMarkAsNoShow?: () => void;
  onMarkAsCompleted?: () => void;
}

export const CheckoutSection: React.FC<CheckoutSectionProps> = ({
  appointmentId,
  selectedCustomer,
  selectedServices,
  selectedPackages,
  services,
  packages,
  discountType,
  discountValue,
  paymentMethod,
  notes,
  onDiscountTypeChange,
  onDiscountValueChange,
  onPaymentMethodChange,
  onNotesChange,
  onPaymentComplete,
  selectedStylists,
  selectedTimeSlots,
  onSaveAppointment,
  onRemoveService,
  onRemovePackage,
  onBackToServices,
  isExistingAppointment,
  customizedServices = {},
  locationId,
  appointmentStatus,
  onCancelAppointment,
  onMarkAsNoShow,
  onMarkAsCompleted
}) => {
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('employment_type', 'stylist');
      
      if (error) throw error;
      return data;
    },
  });

  const { taxRates, fetchTaxRates, isLoading: taxRatesLoading } = useTaxRates();
  const { fetchLocationTaxSettings } = useLocationTaxSettings();
  const [appliedTaxId, setAppliedTaxId] = useState<string | null>(null);
  const [appliedTaxRate, setAppliedTaxRate] = useState<number>(0);
  const [appliedTaxName, setAppliedTaxName] = useState<string>("");
  
  const [membershipDiscount, setMembershipDiscount] = useState<number>(0);
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [membershipName, setMembershipName] = useState<string | null>(null);
  const [loadPayment,setLoadPayment] = useState(false)
  
  const { data: paymentMethods = [], isLoading: paymentMethodsLoading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_enabled', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: customerMemberships = [] } = useQuery({
    queryKey: ['customer-memberships', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      
      const { data, error } = await supabase
        .from('customer_memberships')
        .select(`
          id,
          status,
          membership:memberships(
            id, 
            name, 
            discount_type, 
            discount_value,
            applicable_services, 
            applicable_packages
          )
        `)
        .eq('customer_id', selectedCustomer.id)
        .eq('status', 'active');
        
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCustomer
  });

  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<any | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);

  const subtotal = useMemo(() => 
    getTotalPrice(selectedServices, selectedPackages, services, packages, customizedServices),
    [selectedServices, selectedPackages, services, packages, customizedServices]
  );

  useEffect(() => {
    const loadTaxData = async () => {
      await fetchTaxRates();
      
      if (locationId) {
        const settings = await fetchLocationTaxSettings(locationId);
        
        if (settings && settings.service_tax_id) {
          setAppliedTaxId(settings.service_tax_id);
        }
      }
    };
    
    loadTaxData();
  }, [locationId]);

  useEffect(() => {
    if (appliedTaxId && taxRates.length > 0) {
      const tax = taxRates.find(t => t.id === appliedTaxId);
      if (tax) {
        setAppliedTaxRate(tax.percentage);
        setAppliedTaxName(tax.name);
      }
    } else {
      setAppliedTaxRate(0);
      setAppliedTaxName("");
    }
  }, [appliedTaxId, taxRates]);

  useEffect(() => {
    const fetchCoupons = async () => {
      setIsLoadingCoupons(true);
      try {
        const { data, error } = await supabase
          .from("coupons")
          .select("*")
          .eq("is_active", true)
          .order("code");

        if (error) throw error;
        setAvailableCoupons(data || []);
      } catch (error) {
        console.error("Error fetching coupons:", error);
      } finally {
        setIsLoadingCoupons(false);
      }
    };

    fetchCoupons();
  }, []);

  useEffect(() => {
    if (selectedCouponId && availableCoupons.length > 0) {
      const coupon = availableCoupons.find(c => c.id === selectedCouponId);
      if (coupon) {
        setSelectedCoupon(coupon);
        
        const discountAmount = coupon.discount_type === 'percentage' 
          ? subtotal * (coupon.discount_value / 100)
          : Math.min(coupon.discount_value, subtotal);
        
        setCouponDiscount(discountAmount);
      }
    } else {
      setSelectedCoupon(null);
      setCouponDiscount(0);
    }
  }, [selectedCouponId, availableCoupons, subtotal]);

  useEffect(() => {
    let bestDiscount = 0;
    let bestMembershipId = null;
    let bestMembershipName = null;
    
    if (customerMemberships.length > 0 && (selectedServices.length > 0 || selectedPackages.length > 0)) {
      selectedServices.forEach(serviceId => {
        const service = services.find(s => s.id === serviceId);
        if (!service) return;
        
        customerMemberships.forEach(membership => {
          const membershipData = membership.membership;
          if (!membershipData) return;
          
          const isServiceEligible = 
            membershipData.applicable_services?.includes(serviceId) || 
            (membershipData.applicable_services?.length === 0);
          
          if (isServiceEligible) {
            const discountAmount = membershipData.discount_type === 'percentage'
              ? service.selling_price * (membershipData.discount_value / 100)
              : Math.min(membershipData.discount_value, service.selling_price);
            
            if (discountAmount > bestDiscount) {
              bestDiscount = discountAmount;
              bestMembershipId = membershipData.id;
              bestMembershipName = membershipData.name;
            }
          }
        });
      });
      
      selectedPackages.forEach(packageId => {
        const pkg = packages.find(p => p.id === packageId);
        if (!pkg) return;
        
        const packagePrice = calculatePackagePrice(pkg, customizedServices[packageId] || [], services);
        
        customerMemberships.forEach(membership => {
          const membershipData = membership.membership;
          if (!membershipData) return;
          
          const isPackageEligible = 
            membershipData.applicable_packages?.includes(packageId) || 
            (membershipData.applicable_packages?.length === 0);
          
          if (isPackageEligible) {
            const discountAmount = membershipData.discount_type === 'percentage'
              ? packagePrice * (membershipData.discount_value / 100)
              : Math.min(membershipData.discount_value, packagePrice);
            
            if (discountAmount > bestDiscount) {
              bestDiscount = discountAmount;
              bestMembershipId = membershipData.id;
              bestMembershipName = membershipData.name;
            }
          }
        });
      });
    }
    
    setMembershipDiscount(bestDiscount);
    setMembershipId(bestMembershipId);
    setMembershipName(bestMembershipName);
  }, [customerMemberships, selectedServices, selectedPackages, services, packages, customizedServices]);

  const handleTaxChange = (taxId: string) => {
    if (taxId === "none") {
      setAppliedTaxId(null);
      return;
    }
    setAppliedTaxId(taxId);
  };

  const handleCouponChange = (couponId: string) => {
    if (couponId === "none") {
      setSelectedCouponId(null);
      return;
    }
    setSelectedCouponId(couponId);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`;
    }
    return `${minutes}m`;
  };

  const getStylistName = (stylistId: string) => {
    if (!employees || !stylistId) return null;
    const stylist = employees.find(emp => emp.id === stylistId);
    return stylist ? stylist.name : null;
  };

  const taxAmount = useMemo(() => {
    const regularDiscountedPrice = getFinalPrice(subtotal, discountType, discountValue);
    const afterMembershipDiscount = Math.max(0, regularDiscountedPrice - membershipDiscount);
    const afterAllDiscounts = couponDiscount > 0 
      ? Math.max(0, afterMembershipDiscount - couponDiscount) 
      : afterMembershipDiscount;
    
    return appliedTaxId ? afterAllDiscounts * (appliedTaxRate / 100) : 0;
  }, [subtotal, appliedTaxId, appliedTaxRate, discountType, discountValue, membershipDiscount, couponDiscount]);

  const discountedSubtotal = useMemo(() => {
    const regularDiscountedPrice = getFinalPrice(subtotal, discountType, discountValue);
    const afterMembershipDiscount = Math.max(0, regularDiscountedPrice - membershipDiscount);
    
    return couponDiscount > 0 ? Math.max(0, afterMembershipDiscount - couponDiscount) : afterMembershipDiscount;
  }, [subtotal, discountType, discountValue, membershipDiscount, couponDiscount]);

  const total = useMemo(() => 
    discountedSubtotal + taxAmount,
    [discountedSubtotal, taxAmount]
  );
  
  const discountAmount = useMemo(() => 
    subtotal - discountedSubtotal + couponDiscount + membershipDiscount,
    [subtotal, discountedSubtotal, couponDiscount, membershipDiscount]
  );

  const adjustedPrices = useMemo(() => {
    return getAdjustedServicePrices(
      selectedServices, 
      selectedPackages, 
      services, 
      packages, 
      customizedServices,
      discountType, 
      discountValue,
      membershipDiscount,
      couponDiscount
    );
  }, [
    selectedServices, 
    selectedPackages, 
    services, 
    packages, 
    customizedServices, 
    discountType, 
    discountValue,
    membershipDiscount,
    couponDiscount
  ]);

  const getServiceDisplayPrice = (serviceId: string) => {
    return adjustedPrices[serviceId] !== undefined ? adjustedPrices[serviceId] : 
      (services?.find(s => s.id === serviceId)?.selling_price || 0);
  };

  const selectedItems = useMemo(() => {
    const individualServices = selectedServices.map((id) => {
      const service = services.find((s) => s.id === id);
      return service ? {
        id,
        name: service.name,
        price: service.selling_price,
        adjustedPrice: getServiceDisplayPrice(id),
        duration: service.duration,
        type: "service" as const,
        packageId: null as string | null,
        stylist: selectedStylists[id],
        stylistName: getStylistName(selectedStylists[id]),
        time: selectedTimeSlots[id] || selectedTimeSlots[appointmentId || ''],
        formattedDuration: formatDuration(service.duration),
      } : null;
    }).filter(Boolean);

    const packageItems = selectedPackages.flatMap((packageId) => {
      const pkg = packages.find((p) => p.id === packageId);
      if (!pkg) return [];
      
      const packageTotalPrice = calculatePackagePrice(pkg, customizedServices[packageId] || [], services);
      
      const packageItem = {
        id: packageId,
        name: pkg.name,
        price: packageTotalPrice,
        duration: getTotalDuration([], [packageId], services, packages, customizedServices),
        type: "package" as const,
        packageId: null as string | null,
        stylist: selectedStylists[packageId],
        stylistName: getStylistName(selectedStylists[packageId]),
        time: selectedTimeSlots[packageId] || selectedTimeSlots[appointmentId || ''],
        formattedDuration: formatDuration(getTotalDuration([], [packageId], services, packages, customizedServices)),
        services: [] as Array<{
          id: string;
          name: string;
          price: number;
          adjustedPrice: number;
          duration: number;
          stylist: string | null;
          stylistName: string | null;
          isCustomized: boolean;
        }>
      };
      
      if (pkg.package_services) {
        packageItem.services = pkg.package_services.map(ps => {
          const serviceId = ps.service.id;
          const adjustedPrice = getServiceDisplayPrice(serviceId);
          const originalPrice = ps.package_selling_price !== undefined && ps.package_selling_price !== null
            ? ps.package_selling_price 
            : ps.service.selling_price;
            
          return {
            id: serviceId,
            name: ps.service.name,
            price: originalPrice,
            adjustedPrice: adjustedPrice,
            duration: ps.service.duration,
            stylist: selectedStylists[serviceId] || selectedStylists[packageId] || null,
            stylistName: getStylistName(selectedStylists[serviceId] || selectedStylists[packageId] || ''),
            isCustomized: false
          };
        });
      }
      
      if (customizedServices[packageId] && customizedServices[packageId].length > 0) {
        const additionalServices = customizedServices[packageId]
          .filter(serviceId => {
            return !pkg.package_services.some(ps => ps.service.id === serviceId);
          })
          .map(serviceId => {
            const service = services.find(s => s.id === serviceId);
            if (!service) return null;
            
            return {
              id: service.id,
              name: service.name,
              price: service.selling_price,
              adjustedPrice: getServiceDisplayPrice(service.id),
              duration: service.duration,
              stylist: selectedStylists[service.id] || selectedStylists[packageId] || null,
              stylistName: getStylistName(selectedStylists[service.id] || selectedStylists[packageId] || ''),
              isCustomized: true
            };
          })
          .filter(Boolean);
        
        packageItem.services.push(...additionalServices);
      }
      
      return [packageItem];
    });

    return [...individualServices, ...packageItems] as Array<any>;
  }, [
    selectedServices, 
    selectedPackages, 
    services, 
    packages, 
    selectedStylists, 
    selectedTimeSlots, 
    appointmentId, 
    customizedServices,
    employees,
    adjustedPrices
  ]);

  const handleCheckout = async () => {
    try {
      if (!selectedCustomer) {
        toast.error("Please select a customer");
        return;
      }  
      setLoadPayment(true)    
      
      // Get coupon name if available
      let couponName = null;
      if (selectedCoupon) {
        couponName = selectedCoupon.code;
      }
      
      const saveAppointmentParams = {
        appointmentId,
        appliedTaxId,
        taxAmount,
        couponId: selectedCouponId,
        couponDiscount,
        couponName,
        membershipId,
        membershipName,
        membershipDiscount,
        total,
        adjustedPrices
      };
      
      const savedAppointmentId = await onSaveAppointment(saveAppointmentParams);
      if (!savedAppointmentId) {
        toast.error("Failed to complete payment");
        return;
      }

      toast.success("Payment completed successfully");
      onPaymentComplete(savedAppointmentId);
    } catch (error: any) {
      console.error("Error during checkout:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoadPayment(false);
    }
  };

  // Get background color based on status
  const cardBackgroundColor = appointmentStatus ? getStatusBackgroundColor(appointmentStatus) : '';

  return (
    <div className="h-full w-full bg-gray-50 p-6">
      <Card className={`h-full ${cardBackgroundColor}`}>
        <CardContent className="p-6 h-full flex flex-col">
          <div className="flex flex-col gap-3 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Checkout Summary</h2>
            </div>
            
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={onBackToServices}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Service
              </Button>
            </div>
          </div>

          <div className="flex-1 space-y-6 overflow-hidden flex flex-col">
            {selectedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <p className="text-muted-foreground text-center">
                  No services or packages selected
                </p>
                <Button
                  variant="default"
                  onClick={onBackToServices}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go to Services
                </Button>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                {selectedItems.map((item) => (
                  item && (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="flex flex-col py-4 border-b border-gray-100"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="space-y-1">
                          <p className="text-lg font-semibold tracking-tight">{item.name}</p>
                          <div className="flex flex-wrap text-sm text-muted-foreground gap-2">
                            <div className="flex items-center">
                              <Clock className="mr-1 h-4 w-4" />
                              {item.time && (
                                <span>{item.time} • {item.formattedDuration}</span>
                              )}
                              {!item.time && (
                                <span>{item.formattedDuration}</span>
                              )}
                            </div>
                            {item.stylistName && (
                              <div className="flex items-center">
                                <User className="mr-1 h-4 w-4" />
                                {item.stylistName}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center">
                          {item.type === "package" && (
                            <p className="font-semibold text-lg">
                              <IndianRupee className="inline h-4 w-4" />
                              {item.price}
                            </p>
                          )}
                          {item.type === "service" && (
                            <div className="flex justify-end">
                              {item.price !== item.adjustedPrice && (
                                <p className="font-medium text-lg line-through text-muted-foreground mr-2">
                                  <IndianRupee className="inline h-4 w-4" />
                                  {item.price.toFixed(2)}
                                </p>
                              )}
                              <p className={`font-semibold text-lg ${item.price !== item.adjustedPrice ? "text-green-600" : ""}`}>
                                <IndianRupee className="inline h-4 w-4" />
                                {item.adjustedPrice.toFixed(2)}
                              </p>
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (item.type === 'service') {
                                onRemoveService(item.id);
                              } else {
                                onRemovePackage(item.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {item.type === "package" && item.services && item.services.length > 0 && (
                        <div className="ml-6 mt-2 space-y-2 border-l-2 border-gray-200 pl-4">
                          {item.services.map(service => (
                            <div key={service.id} className="flex items-center justify-between py-1">
                              <div className="space-y-1">
                                <p className="text-sm font-medium">
                                  {service.name}
                                  {service.isCustomized && (
                                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                      Added
                                    </span>
                                  )}
                                </p>
                                <div className="flex flex-wrap text-xs text-muted-foreground gap-2">
                                  <span>{formatDuration(service.duration)}</span>
                                  {service.stylistName && (
                                    <div className="flex items-center">
                                      <User className="mr-1 h-3 w-3" />
                                      {service.stylistName}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm flex flex-col items-end">
                                {service.price !== service.adjustedPrice && (
                                  <span className="text-xs line-through text-muted-foreground">
                                    <IndianRupee className="inline h-3 w-3" />
                                    {service.price.toFixed(2)}
                                  </span>
                                )}
                                <span className={service.price !== service.adjustedPrice ? "text-green-600" : ""}>
                                  <IndianRupee className="inline h-3 w-3" />
                                  {service.adjustedPrice.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                ))}
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Tax</span>
                  <Select value={appliedTaxId || "none"} onValueChange={handleTaxChange}>
                    <SelectTrigger className="h-7 w-[120px]">
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
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Coupon</span>
                  <Select value={selectedCouponId || "none"} onValueChange={handleCouponChange} disabled={isLoadingCoupons}>
                    <SelectTrigger className="h-7 w-[120px]">
                      <SelectValue placeholder="No Coupon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Coupon</SelectItem>
                      {availableCoupons.map(coupon => (
                        <SelectItem key={coupon.id} value={coupon.id}>
                          {coupon.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <span>{selectedCoupon ? `-₹${couponDiscount.toFixed(2)}` : "₹0.00"}</span>
              </div>
              
              {selectedCoupon && (
                <div className="flex justify-between text-xs text-green-600 -mt-2 ml-16">
                  <span>
                    {selectedCoupon.discount_type === 'percentage' 
                      ? `${selectedCoupon.discount_value}% off` 
                      : `Fixed ₹${selectedCoupon.discount_value} off`}
                  </span>
                </div>
              )}

              {membershipDiscount > 0 && membershipName && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="flex items-center">
                    <Award className="mr-2 h-4 w-4" />
                    Membership ({membershipName})
                  </span>
                  <span>-₹{membershipDiscount.toFixed(2)}</span>
                </div>
              )}
              
              {discountType !== "none" && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="flex items-center">
                    <Percent className="mr-2 h-4 w-4" />
                    Discount
                    {discountType === "percentage" && ` (${discountValue}%)`}
                  </span>
                  <span>-₹{(discountType === "percentage" 
                    ? subtotal * (discountValue / 100) 
                    : discountValue).toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-lg font-bold pt-2">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="pt-6 space-y-4 mt-auto">
            <div>
              <h4 className="text-sm font-medium mb-2">Payment Method</h4>
              <Select 
                value={paymentMethod} 
                onValueChange={(value) => onPaymentMethodChange(value as PaymentMethod)} 
                defaultValue="cash"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethodsLoading ? (
                    <SelectItem value="loading">Loading...</SelectItem>
                  ) : paymentMethods.length > 0 ? (
                    paymentMethods.map(method => (
                      <SelectItem key={method.id} value={method.name}>
                        {method.name}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                size="lg"
                onClick={handleCheckout}
                disabled={selectedItems.length === 0}
              >
                {loadPayment ? (
                  <LoaderCircle
                    className="-ms-1 me-2 animate-spin"
                    size={16}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                ) : null}
                Complete Payment
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="lg">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Discount</h3>
                    <div className="flex gap-4">
                      <Select
                        value={discountType}
                        onValueChange={(value) => onDiscountTypeChange(value as DiscountType)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Discount type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Discount</SelectItem>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>

                      {discountType !== "none" && (
                        <div className="flex-1">
                          <Input
                            type="number"
                            value={discountValue}
                            onChange={(e) => onDiscountValueChange(Number(e.target.value))}
                            min="0"
                            step={discountType === "percentage" ? "1" : "100"}
                            placeholder={discountType === "percentage" ? "%" : "₹"}
                          />
                        </div>
                      )}
                    </div>
                    
                    <h3 className="font-semibold">Notes</h3>
                    <Textarea
                      value={notes}
                      onChange={(e) => onNotesChange(e.target.value)}
                      placeholder="Add notes about this appointment"
                      className="min-h-20"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
