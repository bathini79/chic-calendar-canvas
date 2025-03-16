import React, { useMemo } from "react";
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
  Trash2
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
  onSaveAppointment: () => Promise<string | null>;
  onRemoveService: (serviceId: string) => void;
  onRemovePackage: (packageId: string) => void;
  onBackToServices: () => void;
  isExistingAppointment?: boolean;
  customizedServices?: Record<string, string[]>;
  locationId?: string;
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
  locationId
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

  const subtotal = useMemo(() => 
    getTotalPrice(selectedServices, selectedPackages, services, packages, customizedServices),
    [selectedServices, selectedPackages, services, packages, customizedServices]
  );

  const totalDuration = useMemo(() => 
    getTotalDuration(selectedServices, selectedPackages, services, packages, customizedServices),
    [selectedServices, selectedPackages, services, packages, customizedServices]
  );

  const total = useMemo(() => 
    getFinalPrice(subtotal, discountType, discountValue),
    [subtotal, discountType, discountValue]
  );
  
  const discountAmount = useMemo(() => 
    subtotal - total,
    [subtotal, total]
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
    employees
  ]);

  const handlePayment = async () => {
    try {
      if (!selectedCustomer) {
        toast.error("Please select a customer");
        return;
      }
      const savedAppointmentId = await onSaveAppointment();
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
                              <p className="text-sm">
                                <IndianRupee className="inline h-3 w-3" />
                                {service.price}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {item.type === "service" && (
                        <div className="flex justify-end">
                          <p className="font-semibold text-lg">
                            <IndianRupee className="inline h-4 w-4" />
                            {item.price}
                          </p>
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
              {discountType !== "none" && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="flex items-center">
                    <Percent className="mr-2 h-4 w-4" />
                    Discount
                    {discountType === "percentage" && ` (${discountValue}%)`}
                  </span>
                  <span>-₹{discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2">
                <span>Total</span>
                <span>₹{total}</span>
              </div>
            </div>
          </div>

          <div className="pt-6 space-y-4 mt-auto">
            <div>
              <h4 className="text-sm font-medium mb-2">Payment Method</h4>
              <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                size="lg"
                onClick={handlePayment}
                disabled={selectedItems.length === 0}
              >
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
                        onValueChange={onDiscountTypeChange}
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
                        <Input
                          type="number"
                          placeholder={
                            discountType === "percentage"
                              ? "Enter %"
                              : "Enter amount"
                          }
                          value={discountValue}
                          onChange={(e) =>
                            onDiscountValueChange(Number(e.target.value))
                          }
                          className="w-24"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold">Notes</h3>
                      <Textarea
                        placeholder="Add appointment notes..."
                        value={notes}
                        onChange={(e) => onNotesChange(e.target.value)}
                        rows={3}
                      />
                    </div>
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
