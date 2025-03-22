
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
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import type { Service, Package, Customer } from "../types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from 'date-fns';
import { 
  getTotalPrice, 
  getTotalDuration, 
  getFinalPrice, 
  getServicePriceInPackage,
  calculatePackagePrice 
} from "../utils/bookingUtils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTaxRates } from "@/hooks/use-tax-rates";
import { useLocationTaxSettings } from "@/hooks/use-location-tax-settings";

interface CheckoutSectionProps {
  appointmentId?: string;
  selectedCustomer: Customer | null;
  selectedServices: string[];
  selectedPackages: string[];
  services: Service[];
  packages: Package[];
  discountType: 'none' | 'percentage' | 'fixed';
  discountValue: number;
  paymentMethod: 'cash' | 'online';
  notes: string;
  onDiscountTypeChange: (type: 'none' | 'percentage' | 'fixed') => void;
  onDiscountValueChange: (value: number) => void;
  onPaymentMethodChange: (method: 'cash' | 'online') => void;
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
  membershipId?: string;
  hasMembershipDiscount?: boolean;
  membershipEligibleServices?: string[];
  membershipEligiblePackages?: string[];
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
  membershipId,
  hasMembershipDiscount = false,
  membershipEligibleServices = [],
  membershipEligiblePackages = []
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

  const formatTimeSlot = (timeString: string) => {
    try {
      const baseDate = new Date();
      const [hours, minutes] = timeString.split(':').map(Number);
      baseDate.setHours(hours, minutes);
      return format(baseDate, 'hh:mm a');
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString;
    }
  };

  const getStylistName = (stylistId: string) => {
    if (!employees || !stylistId) return null;
    const stylist = employees.find(emp => emp.id === stylistId);
    return stylist ? stylist.name : null;
  };

  const totalDuration = useMemo(() => 
    getTotalDuration(selectedServices, selectedPackages, services, packages, customizedServices),
    [selectedServices, selectedPackages, services, packages, customizedServices]
  );

  // Calculate if an item is eligible for membership benefits
  const isItemEligibleForMembership = (itemId: string, itemType: 'service' | 'package') => {
    if (!hasMembershipDiscount) return false;
    
    // If membership applies to all items (no specific services/packages listed)
    if (membershipEligibleServices.length === 0 && membershipEligiblePackages.length === 0) {
      return true;
    }
    
    // Check specific eligibility
    if (itemType === 'service') {
      return membershipEligibleServices.includes(itemId);
    } else {
      return membershipEligiblePackages.includes(itemId);
    }
  };

  const taxAmount = useMemo(() => {
    const regularDiscountedPrice = getFinalPrice(subtotal, discountType, discountValue);
    const afterAllDiscounts = couponDiscount > 0 
      ? Math.max(0, regularDiscountedPrice - couponDiscount) 
      : regularDiscountedPrice;
    
    return appliedTaxId ? afterAllDiscounts * (appliedTaxRate / 100) : 0;
  }, [subtotal, appliedTaxId, appliedTaxRate, discountType, discountValue, couponDiscount]);

  const discountedSubtotal = useMemo(() => {
    const regularDiscountedPrice = getFinalPrice(subtotal, discountType, discountValue);
    
    return couponDiscount > 0 ? Math.max(0, regularDiscountedPrice - couponDiscount) : regularDiscountedPrice;
  }, [subtotal, discountType, discountValue, couponDiscount]);

  const total = useMemo(() => 
    discountedSubtotal + taxAmount,
    [discountedSubtotal, taxAmount]
  );
  
  const discountAmount = useMemo(() => 
    subtotal - discountedSubtotal + couponDiscount,
    [subtotal, discountedSubtotal, couponDiscount]
  );

  const selectedItems = useMemo(() => {
    const individualServices = selectedServices.map((id) => {
      const service = services.find((s) => s.id === id);
      return service ? {
        id,
        name: service.name,
        price: service.selling_price,
        duration: service.duration,
        type: "service" as const,
        packageId: null as string | null,
        stylist: selectedStylists[id],
        stylistName: getStylistName(selectedStylists[id]),
        time: selectedTimeSlots[id] || selectedTimeSlots[appointmentId || ''],
        formattedDuration: formatDuration(service.duration),
        isMembershipEligible: isItemEligibleForMembership(id, 'service')
      } : null;
    }).filter(Boolean);

    const packageItems = selectedPackages.flatMap((packageId) => {
      const pkg = packages.find((p) => p.id === packageId);
      if (!pkg) return [];
      
      const packageTotalPrice = calculatePackagePrice(pkg, customizedServices[packageId] || [], services);
      const isMembershipEligible = isItemEligibleForMembership(packageId, 'package');
      
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
        isMembershipEligible,
        services: [] as Array<{
          id: string;
          name: string;
          price: number;
          duration: number;
          stylist: string | null;
          stylistName: string | null;
          isCustomized: boolean;
        }>
      };
      
      if (pkg.package_services) {
        packageItem.services = pkg.package_services.map(ps => {
          const adjustedPrice = ps.package_selling_price !== undefined && ps.package_selling_price !== null
            ? ps.package_selling_price 
            : ps.service.selling_price;
            
          return {
            id: ps.service.id,
            name: ps.service.name,
            price: adjustedPrice,
            duration: ps.service.duration,
            stylist: selectedStylists[ps.service.id] || selectedStylists[packageId] || null,
            stylistName: getStylistName(selectedStylists[ps.service.id] || selectedStylists[packageId] || ''),
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
    hasMembershipDiscount,
    membershipEligibleServices,
    membershipEligiblePackages
  ]);

  const handlePayment = async () => {
    try {
      if (!selectedCustomer) {
        toast.error("Please select a customer");
        return;
      }
      
      console.log("Payment data:", {
        taxId: appliedTaxId,
        taxAmount,
        couponId: selectedCouponId,
        couponDiscount,
        total,
        membershipId
      });
      
      // Pass the summary data with values already calculated
      const saveAppointmentParams = {
        appointmentId: appointmentId, // Include the appointmentId in the params
        appliedTaxId: appliedTaxId,
        taxAmount: taxAmount,
        couponId: selectedCouponId,
        couponDiscount: couponDiscount,
        total: total,
        membershipId: membershipId
      };
      
      const savedAppointmentId = await onSaveAppointment(saveAppointmentParams);
      if (!savedAppointmentId) {
        toast.error("Failed to complete payment");
        return;
      }

      toast.success("Payment completed successfully");
      onPaymentComplete(savedAppointmentId);
    } catch (error: any) {
      console.error("Error completing payment:", error);
      toast.error(error.message || "Failed to complete payment");
    }
  };

  return (
    <div className="h-full w-full bg-gray-50 p-6">
      <Card className="h-full">
        <CardContent className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Checkout Summary</h2>
            <Button
              variant="outline"
              onClick={onBackToServices}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Service
            </Button>
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
                          <div className="flex items-center">
                            <p className="text-lg font-semibold tracking-tight">{item.name}</p>
                            {item.isMembershipEligible && hasMembershipDiscount && (
                              <Badge variant="outline" className="ml-2 text-xs flex items-center gap-1 border-green-500 text-green-600">
                                <Sparkles className="h-3 w-3" />
                                <span>Membership</span>
                              </Badge>
                            )}
                          </div>
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
                        <div className="flex items-center gap-4">
                          {item.type === "package" && (
                            <p className="font-semibold text-lg">
                              <IndianRupee className="inline h-4 w-4" />
                              {item.price}
                            </p>
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
                        <div className="ml-4 mt-2 pl-2 border-l border-gray-200">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Services Included:
                          </p>
                          <div className="space-y-1">
                            {item.services.map((service, index) => (
                              <div 
                                key={`${service.id}-${index}`}
                                className="flex justify-between items-center text-sm"
                              >
                                <div className="flex items-center">
                                  <span className="text-gray-700">• {service.name}</span>
                                  {service.isCustomized && (
                                    <Badge 
                                      variant="outline" 
                                      className="ml-2 px-1 py-0 h-4 text-[10px]"
                                    >
                                      Added
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {service.stylistName || 'Any stylist'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                ))}
              </div>
            )}

            <div className="border-t pt-4 space-y-4 mt-auto">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                
                {hasMembershipDiscount && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      <span>Membership Discount</span>
                    </span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                
                {!hasMembershipDiscount && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <Select 
                        value={discountType} 
                        onValueChange={(value) => onDiscountTypeChange(value as 'none' | 'percentage' | 'fixed')}
                      >
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {discountType !== 'none' && (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={discountValue}
                          onChange={(e) => onDiscountValueChange(parseFloat(e.target.value) || 0)}
                          className="w-16 h-8"
                        />
                        {discountType === 'percentage' && <Percent className="h-3 w-3" />}
                      </div>
                    )}
                    {discountAmount > 0 && discountType !== 'none' && (
                      <span className="text-sm">-{formatPrice(discountAmount)}</span>
                    )}
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Coupon</span>
                    <Select
                      value={selectedCouponId || "none"}
                      onValueChange={handleCouponChange}
                      disabled={isLoadingCoupons}
                    >
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue placeholder="Select coupon" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {availableCoupons.map((coupon) => (
                          <SelectItem key={coupon.id} value={coupon.id}>
                            {coupon.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {couponDiscount > 0 && (
                    <span className="text-sm">-{formatPrice(couponDiscount)}</span>
                  )}
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <Select
                      value={appliedTaxId || "none"}
                      onValueChange={handleTaxChange}
                      disabled={taxRatesLoading}
                    >
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue placeholder="No tax" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No tax</SelectItem>
                        {taxRates.map((tax) => (
                          <SelectItem key={tax.id} value={tax.id}>
                            {tax.name} ({tax.percentage}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {taxAmount > 0 && (
                    <span className="text-sm">{formatPrice(taxAmount)}</span>
                  )}
                </div>
                
                <Separator className="my-2" />
                
                <div className="flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Payment Method</label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(value) => onPaymentMethodChange(value as 'cash' | 'online')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Notes</label>
                  <Textarea
                    placeholder="Add notes about this appointment"
                    value={notes}
                    onChange={(e) => onNotesChange(e.target.value)}
                    className="resize-none"
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={onBackToServices}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 bg-black text-white"
                    onClick={handlePayment}
                    disabled={selectedItems.length === 0}
                  >
                    Pay Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
