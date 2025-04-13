import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SelectCustomer } from "@/components/admin/bookings/components/SelectCustomer";
import { Separator } from "@/components/ui/separator";
import { format, parse } from "date-fns";
import { Service, Package, Customer, SCREEN, Employee, PaymentMethod, DiscountType } from "../types";
import { toast } from "sonner";
import { AlertCircle, CalendarIcon, ChevronLeft, ChevronRight, PackageOpen, Plus, Scissors, Search, Tag, X } from "lucide-react";
import { ServiceItem } from "@/components/admin/bookings/components/ServiceItem";
import { PackageItem } from "@/components/admin/bookings/components/PackageItem";
import { CreateClientDialog } from "@/components/admin/bookings/components/CreateClientDialog";
import { formatPrice } from "@/lib/utils";
import { useActiveServices } from "../hooks/useActiveServices";
import { useActivePackages } from "../hooks/useActivePackages";
import useSaveAppointment from "../hooks/useSaveAppointment";
import CheckoutSection from "./CheckoutSection";
import { SummaryView } from "./SummaryView";
import { useLoyaltyInCheckout } from "../hooks/useLoyaltyInCheckout";

interface AppointmentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  selectedTime: string;
  employees: Employee[];
  existingAppointment?: any;
  locationId?: string;
  onAppointmentSaved?: () => void;
}

export const AppointmentManager: React.FC<AppointmentManagerProps> = ({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  employees,
  existingAppointment,
  locationId,
  onAppointmentSaved,
}) => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>("none");
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [currentScreen, setCurrentScreen] = useState<SCREEN>(SCREEN.SERVICE_SELECTION);
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
  const [customizedServices, setCustomizedServices] = useState<Record<string, string[]>>({});
  const [selectedStylists, setSelectedStylists] = useState<Record<string, string>>({});
  const [selectedTaxRate, setSelectedTaxRate] = useState<any>(null);
  const [taxAmount, setTaxAmount] = useState(0);
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [selectedMembership, setSelectedMembership] = useState<any>(null);
  const [membershipDiscount, setMembershipDiscount] = useState(0);

  // Add state for loyalty points
  const [pointsEarned, setPointsEarned] = useState(0);
  const [pointsRedeemed, setPointsRedeemed] = useState(0);
  const [pointsDiscountAmount, setPointsDiscountAmount] = useState(0);

  const { services, isLoading: isLoadingServices } = useActiveServices();
  const { packages, isLoading: isLoadingPackages } = useActivePackages();

  useEffect(() => {
    if (existingAppointment) {
      setSelectedCustomer(existingAppointment.customer);
      setSelectedServices(existingAppointment.bookings.filter((b: any) => b.service_id).map((b: any) => b.service_id));
      setSelectedPackages(existingAppointment.bookings.filter((b: any) => b.package_id).map((b: any) => b.package_id));
      setDiscountType(existingAppointment.discount_type);
      setDiscountValue(existingAppointment.discount_value);
      setPaymentMethod(existingAppointment.payment_method);
      setNotes(existingAppointment.notes || "");
      setSelectedStylists(existingAppointment.bookings.reduce((acc: any, booking: any) => {
        acc[booking.service_id] = booking.employee_id || "any";
        return acc;
      }, {}));
      setSelectedTaxRate(existingAppointment.tax_id);
    }
  }, [existingAppointment]);

  useEffect(() => {
    if (services && packages) {
      const initialStylists: Record<string, string> = {};
      services.forEach(service => {
        initialStylists[service.id] = "any";
      });
      packages.forEach(pkg => {
        pkg.package_services?.forEach(ps => {
          initialStylists[ps.service_id] = "any";
        });
      });
      setSelectedStylists(initialStylists);
    }
  }, [services, packages]);

  useEffect(() => {
    const calculateTax = async () => {
      if (!selectedTaxRate) {
        setTaxAmount(0);
        return;
      }

      try {
        const { data: taxRate, error } = await supabase
          .from('tax_rates')
          .select('percentage')
          .eq('id', selectedTaxRate)
          .single();

        if (error) throw error;

        const subtotal = getSubtotal();
        const discount = calculateDiscount(discountType, discountValue);
        const discountedSubtotal = Math.max(0, subtotal - discount);
        const calculatedTaxAmount = (discountedSubtotal * taxRate.percentage) / 100;

        setTaxAmount(calculatedTaxAmount);
      } catch (error) {
        console.error("Error fetching tax rate:", error);
        setTaxAmount(0);
      }
    };

    calculateTax();
  }, [selectedTaxRate, discountType, discountValue, services, packages, selectedServices, selectedPackages, customizedServices]);

  // Use loyalty in checkout
  const {
    isLoyaltyEnabled,
    pointsToEarn,
    customerPoints,
    usePoints,
    pointsToRedeem,
    pointsDiscountAmount: calculatedPointsDiscountAmount,
    maxPointsToRedeem,
    minRedemptionPoints,
    pointValue,
    setUsePoints,
    setPointsToRedeem
  } = useLoyaltyInCheckout({
    customerId: selectedCustomer?.id,
    selectedServices,
    selectedPackages,
    services,
    packages,
    subtotal: getSubtotal(),
    discountedSubtotal: getDiscountedSubtotal()
  });

  // Update points values when they change in loyalty hook
  useEffect(() => {
    setPointsEarned(pointsToEarn);
    setPointsRedeemed(usePoints ? pointsToRedeem : 0);
    setPointsDiscountAmount(calculatedPointsDiscountAmount);
  }, [pointsToEarn, pointsToRedeem, usePoints, calculatedPointsDiscountAmount]);

  const resetForm = () => {
    setSelectedServices([]);
    setSelectedPackages([]);
    setDiscountType("none");
    setDiscountValue(0);
    setPaymentMethod("cash");
    setNotes("");
    setCustomizedServices({});
    setSelectedStylists({});
    setSelectedTaxRate(null);
    setTaxAmount(0);
    setSelectedCoupon(null);
    setCouponDiscount(0);
    setSelectedMembership(null);
    setMembershipDiscount(0);
  };

  const getTotalDuration = (services: any[], packages: any[]) => {
    let totalDuration = 0;

    for (const service of services) {
      totalDuration += service.duration;
    }

    for (const pkg of packages) {
      totalDuration += pkg.duration;
    }

    return totalDuration;
  };

  const getTotalPrice = (
    services: any[],
    packages: any[],
    discountType: string,
    discountValue: number
  ) => {
    let totalPrice = 0;

    for (const service of services) {
      totalPrice += service.selling_price;
    }

    for (const pkg of packages) {
      totalPrice += pkg.price;
    }

    if (discountType === "percentage") {
      totalPrice -= (totalPrice * discountValue) / 100;
    } else if (discountType === "fixed") {
      totalPrice -= discountValue;
    }

    return totalPrice;
  };

  const handleSaveAppointment = async (
    params?: any
  ): Promise<string | undefined> => {
    try {
      return "";
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      toast.error(error.message || "Failed to save appointment");
      return undefined;
    }
  };

  const { handleSaveAppointment: saveAppointment, isLoading: isSavingAppointment } = useSaveAppointment({
    selectedDate,
    selectedTime,
    selectedCustomer,
    selectedServices,
    selectedPackages,
    services,
    packages,
    selectedStylists,
    getTotalDuration,
    getTotalPrice,
    discountType,
    discountValue,
    paymentMethod,
    notes,
    customizedServices,
    currentScreen,
    locationId,
    appliedTaxId: selectedTaxRate,
    taxAmount,
    couponId: selectedCoupon?.id || null,
    couponDiscount,
    coupon_name: selectedCoupon?.code || null,
    coupon_amount: couponDiscount || null,
    membership_discount: membershipDiscount,
    membership_id: selectedMembership?.id || null,
    membership_name: selectedMembership?.name || null,
    pointsEarned,
    pointsRedeemed,
    pointsDiscountAmount
  });

  const handleSaveCheckout = async () => {
    const checkoutParams = {
      appliedTaxId: selectedTaxRate,
      taxAmount,
      couponId: selectedCoupon?.id || null,
      couponName: selectedCoupon?.code || null,
      couponAmount: couponDiscount || null,
      membershipDiscount: membershipDiscount,
      membershipId: selectedMembership?.id || null,
      membershipName: selectedMembership?.name || null,
      pointsEarned,
      pointsRedeemed,
      pointsDiscountAmount
    };

    try {
      if (!selectedCustomer) {
        toast.error("Please select a customer");
        return;
      }

      if (selectedServices.length === 0 && selectedPackages.length === 0) {
        toast.error("Please select at least one service or package");
        return;
      }

      if (!selectedDate) {
        toast.error("Please select a date");
        return;
      }

      const appointmentId = await saveAppointment(checkoutParams);

      if (appointmentId) {
        setCurrentScreen(SCREEN.SUMMARY);
        onAppointmentSaved && onAppointmentSaved();
      }
    } catch (error: any) {
      console.error("Error during checkout:", error);
      toast.error(error.message || "Failed to complete checkout");
    }
  };

  const getSubtotal = () => {
    let total = 0;

    for (const serviceId of selectedServices) {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        total += service.selling_price;
      }
    }

    for (const packageId of selectedPackages) {
      const pkg = packages.find(p => p.id === packageId);
      if (pkg) {
        total += pkg.price;

        const customServiceIds = customizedServices[packageId] || [];
        for (const customServiceId of customServiceIds) {
          const customService = services.find(s => s.id === customServiceId);
          if (customService) {
            const packageServices = pkg.package_services?.map(ps => ps.service_id);
            const isPartOfPackage = packageServices?.includes(customServiceId);

            if (!isPartOfPackage) {
              total += customService.selling_price;
            }
          }
        }
      }
    }

    return total;
  };

  const calculateDiscount = (discountType: DiscountType, value: number) => {
    const subtotal = getSubtotal();

    if (discountType === "percentage") {
      return (subtotal * value) / 100;
    } else if (discountType === "fixed") {
      return value;
    }
    return 0;
  };

  const getDiscountedSubtotal = () => {
    const subtotal = getSubtotal();
    const discount = calculateDiscount(discountType, discountValue);
    return Math.max(0, subtotal - discount);
  };

  const getItems = () => {
    const items: any[] = [];

    for (const serviceId of selectedServices) {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        items.push({
          id: service.id,
          name: service.name,
          price: service.selling_price,
          type: "service",
          employee: employees.find(e => e.id === selectedStylists[serviceId]),
          duration: service.duration
        });
      }
    }

    for (const packageId of selectedPackages) {
      const pkg = packages.find(p => p.id === packageId);
      if (pkg) {
        items.push({
          id: pkg.id,
          name: pkg.name,
          price: pkg.price,
          type: "package",
          duration: pkg.duration
        });
      }
    }

    return items;
  };

  // Update getTotal function to include loyalty points discount
  const getTotal = () => {
    let total = getDiscountedSubtotal();
    
    // Apply membership discount if available
    if (membershipDiscount > 0) {
      total -= membershipDiscount;
    }
    
    // Apply coupon discount if available
    if (couponDiscount > 0) {
      total -= couponDiscount;
    }
    
    // Apply loyalty points discount if using points
    if (pointsDiscountAmount > 0) {
      total -= pointsDiscountAmount;
    }
    
    // Add tax amount if available
    if (taxAmount > 0) {
      total += taxAmount;
    }
    
    return Math.max(0, total);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1000px] min-h-[80vh] max-h-[90vh] overflow-hidden">
        <div className="h-full overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {existingAppointment ? "Edit Appointment" : "New Appointment"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex h-full overflow-hidden">
            <div className="w-1/2 pr-4 border-r overflow-y-auto">
              {/* Service Selection Section */}
              <div className="space-y-4">
                <SelectCustomer
                  selectedCustomer={selectedCustomer}
                  onCustomerSelect={setSelectedCustomer}
                  onCreateNew={() => setIsCreateClientOpen(true)}
                />

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    <Scissors className="w-5 h-5 inline-block mr-1" />
                    Services
                  </h3>
                  {isLoadingServices ? (
                    <div>Loading services...</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {services?.map((service) => (
                        <ServiceItem
                          key={service.id}
                          service={service}
                          isSelected={selectedServices.includes(service.id)}
                          onSelect={() => {
                            if (selectedServices.includes(service.id)) {
                              setSelectedServices(selectedServices.filter((id) => id !== service.id));
                            } else {
                              setSelectedServices([...selectedServices, service.id]);
                            }
                          }}
                          employee={employees.find(e => e.id === selectedStylists[service.id])}
                          onEmployeeChange={(employeeId) => {
                            setSelectedStylists({
                              ...selectedStylists,
                              [service.id]: employeeId
                            });
                          }}
                          employees={employees}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    <PackageOpen className="w-5 h-5 inline-block mr-1" />
                    Packages
                  </h3>
                  {isLoadingPackages ? (
                    <div>Loading packages...</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {packages?.map((pkg) => (
                        <PackageItem
                          key={pkg.id}
                          pkg={pkg}
                          isSelected={selectedPackages.includes(pkg.id)}
                          onSelect={() => {
                            if (selectedPackages.includes(pkg.id)) {
                              setSelectedPackages(selectedPackages.filter((id) => id !== pkg.id));
                            } else {
                              setSelectedPackages([...selectedPackages, pkg.id]);
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="w-1/2 pl-4 overflow-y-auto">
              {/* Checkout Section */}
              {currentScreen === SCREEN.CHECKOUT && (
                <CheckoutSection
                  selectedServices={selectedServices}
                  selectedPackages={selectedPackages}
                  services={services}
                  packages={packages}
                  discountType={discountType}
                  setDiscountType={setDiscountType}
                  discountValue={discountValue}
                  setDiscountValue={setDiscountValue}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  notes={notes}
                  setNotes={setNotes}
                  handleCheckout={handleSaveCheckout}
                  loadingCheckout={isSavingAppointment}
                  selectedCustomer={selectedCustomer}
                  customizedServices={customizedServices}
                  appointmentId={existingAppointment?.id}
                  handleSaveAppointment={handleSaveCheckout}
                  loadingPayment={isSavingAppointment}
                  appliedTaxId={selectedTaxRate}
                  taxAmount={taxAmount}
                />
              )}
              
              {/* Service Selection Buttons */}
              {currentScreen === SCREEN.SERVICE_SELECTION && (
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={() => setCurrentScreen(SCREEN.CHECKOUT)}>
                    Continue to Checkout
                  </Button>
                </div>
              )}
              
              {/* Summary View */}
              {currentScreen === SCREEN.SUMMARY && existingAppointment?.id && (
                <SummaryView
                  appointmentId={existingAppointment.id}
                  customer={{
                    id: selectedCustomer.id,
                    full_name: selectedCustomer.full_name,
                    email: selectedCustomer.email,
                    phone_number: selectedCustomer.phone_number
                  }}
                  totalPrice={getTotal()}
                  items={getItems()}
                  paymentMethod={paymentMethod}
                  onAddAnother={() => {
                    resetForm();
                    setCurrentScreen(SCREEN.SERVICE_SELECTION);
                  }}
                  taxAmount={taxAmount}
                  subTotal={getSubtotal()}
                  membershipName={selectedMembership?.name}
                  membershipDiscount={membershipDiscount}
                />
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      <CreateClientDialog
        open={isCreateClientOpen}
        onClose={() => setIsCreateClientOpen(false)}
        onSuccess={(customer: Customer) => {
          setSelectedCustomer(customer);
          setIsCreateClientOpen(false);
        }}
      />
    </Dialog>
  );
};
