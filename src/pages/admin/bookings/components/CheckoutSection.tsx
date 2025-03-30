import React, { useCallback, useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Service, Package, AppointmentStatus } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppointmentDetails } from "../hooks/useAppointmentDetails";
import { formatPrice } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CheckoutSectionProps {
  appointmentId: string;
  selectedCustomer: any;
  selectedServices: string[];
  selectedPackages: string[];
  services: Service[];
  packages: Package[];
  discountType: string;
  discountValue: number;
  paymentMethod: string;
  notes: string;
  onDiscountTypeChange: (type: "none" | "percentage" | "fixed") => void;
  onDiscountValueChange: (value: number) => void;
  onPaymentMethodChange: (method: "cash" | "online" | "card") => void;
  onNotesChange: (notes: string) => void;
  onPaymentComplete: (appointmentId?: string) => void;
  selectedStylists: Record<string, string>;
  selectedTimeSlots: Record<string, string>;
  onSaveAppointment: () => Promise<string | null>;
  onRemoveService: (serviceId: string) => void;
  onRemovePackage: (packageId: string) => void;
  onBackToServices: () => void;
  customizedServices: Record<string, string[]>;
  isExistingAppointment?: boolean;
  onCancelAppointment?: () => void;
  onMarkAsNoShow?: () => void;
  onMarkAsCompleted?: () => void;
  locationId?: string;
  appointmentStatus?: AppointmentStatus;
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
  customizedServices,
  isExistingAppointment = false,
  onCancelAppointment,
  onMarkAsNoShow,
  onMarkAsCompleted,
  locationId,
  appointmentStatus = "pending",
}) => {
  const [taxRate, setTaxRate] = useState(0);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [showNoShowConfirmation, setShowNoShowConfirmation] = useState(false);

  const { appointment, refetch } = useAppointmentDetails(appointmentId);

  useEffect(() => {
    const fetchTaxRate = async () => {
      try {
        if (!locationId) return;

        const { data, error } = await fetch(`/api/taxes?locationId=${locationId}`).then(res => res.json());
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          setTaxRate(data[0].rate / 100); // Convert percentage to decimal
        }
      } catch (error) {
        console.error("Error fetching tax rate:", error);
      }
    };

    fetchTaxRate();
  }, [locationId]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/employees');
        const data = await response.json();
        setEmployees(data);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };

    fetchEmployees();
  }, []);

  const servicesToDisplay = selectedServices
    .map((id) => services.find((service) => service.id === id))
    .filter(Boolean);

  const packagesToDisplay = selectedPackages
    .map((id) => packages.find((pkg) => pkg.id === id))
    .filter(Boolean);

  const handleServicePayment = async () => {
    const appointmentId = await onSaveAppointment();
    if (appointmentId) {
      onPaymentComplete(appointmentId);
    }
  };

  const calculateSubtotal = () => {
    let total = 0;

    // Add service prices
    for (const serviceId of selectedServices) {
      const service = services.find((s) => s.id === serviceId);
      if (service) {
        total += service.selling_price;
      }
    }

    // Add package prices
    for (const packageId of selectedPackages) {
      const pkg = packages.find((p) => p.id === packageId);
      if (pkg) {
        total += pkg.price;

        // Add customized services for this package
        const customServices = customizedServices[packageId] || [];
        for (const serviceId of customServices) {
          const service = services.find((s) => s.id === serviceId);
          if (service) {
            total += service.selling_price;
          }
        }
      }
    }

    return total;
  };

  const calculateCustomServicePrice = (packageId: string) => {
    let total = 0;
    const customServices = customizedServices[packageId] || [];
    
    for (const serviceId of customServices) {
      const service = services.find((s) => s.id === serviceId);
      if (service) {
        total += service.selling_price;
      }
    }
    
    return total;
  };

  const calculateDiscount = (subtotal: number) => {
    if (discountType === "percentage") {
      return (subtotal * discountValue) / 100;
    } else if (discountType === "fixed") {
      return discountValue;
    }
    return 0;
  };

  const calculateTaxAmount = (subtotal: number) => {
    const discountAmount = calculateDiscount(subtotal);
    const taxableAmount = subtotal - discountAmount;
    return taxableAmount * taxRate;
  };

  const calculateTotal = (subtotal: number) => {
    const discountAmount = calculateDiscount(subtotal);
    const taxAmount = calculateTaxAmount(subtotal);
    return subtotal - discountAmount + taxAmount;
  };

  const subtotal = calculateSubtotal();
  const total = calculateTotal(subtotal);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b flex-shrink-0 flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <Button 
            variant="outline" 
            className="text-gray-500"
            onClick={onBackToServices}
          >
            ← Back
          </Button>
          <h2 className="text-lg font-semibold">Checkout</h2>
        </div>
        
        {/* Only show appointment status badge here, dropdown is moved to the AppointmentManager */}
        {isExistingAppointment && (
          <StatusBadge status={appointmentStatus} />
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-4">Services</h3>
            {servicesToDisplay.length === 0 && packagesToDisplay.length === 0 && (
              <p className="text-sm text-gray-500">No services selected</p>
            )}
            <ul className="space-y-3">
              {servicesToDisplay.map((service) => (
                <li
                  key={service?.id}
                  className="bg-gray-50 p-3 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">{service?.name}</p>
                    <div className="flex gap-1 items-center">
                      <span className="text-sm text-gray-500">
                        {service?.duration} mins
                      </span>
                      {selectedStylists[service?.id!] && (
                        <span className="text-sm text-gray-500">
                          {" "}
                          • with{" "}
                          {
                            employees.find(
                              (emp) => emp.id === selectedStylists[service?.id!]
                            )?.name || "Staff"
                          }
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(service?.selling_price || 0)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => onRemoveService(service?.id || "")}
                    >
                      ✕
                    </Button>
                  </div>
                </li>
              ))}

              {packagesToDisplay.map((pkg) => (
                <li
                  key={pkg?.id}
                  className="bg-gray-50 p-3 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">{pkg?.name}</p>
                    <div className="flex gap-1 items-center">
                      <span className="text-sm text-gray-500">
                        {pkg?.duration} mins
                      </span>
                      {selectedStylists[pkg?.id!] && (
                        <span className="text-sm text-gray-500">
                          {" "}
                          • with{" "}
                          {
                            employees.find(
                              (emp) => emp.id === selectedStylists[pkg?.id!]
                            )?.name || "Staff"
                          }
                        </span>
                      )}
                    </div>
                    {customizedServices[pkg?.id!]?.length > 0 && (
                      <ul className="mt-1 pl-4">
                        {customizedServices[pkg?.id!].map((serviceId) => {
                          const service = services.find(
                            (s) => s.id === serviceId
                          );
                          return (
                            <li
                              key={serviceId}
                              className="text-sm text-gray-500 flex justify-between"
                            >
                              <span>+ {service?.name}</span>
                              <span>
                                {formatPrice(service?.selling_price || 0)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatPrice((pkg?.price || 0) + calculateCustomServicePrice(pkg?.id || ""))}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => onRemovePackage(pkg?.id || "")}
                    >
                      ✕
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="font-semibold">{formatPrice(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>Discount</span>
                <Select value={discountType} onValueChange={onDiscountTypeChange}>
                  <SelectTrigger className="w-[110px] h-8">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
                {discountType !== "none" && (
                  <Input
                    type="number"
                    className="w-[80px] h-8"
                    value={discountValue}
                    onChange={(e) => onDiscountValueChange(Number(e.target.value))}
                  />
                )}
              </div>
              <span className="font-semibold text-red-500">
                {discountType !== "none" && `-${formatPrice(calculateDiscount(subtotal))}`}
              </span>
            </div>

            {/* Tax section */}
            {taxRate > 0 && (
              <div className="flex items-center justify-between">
                <span>Tax ({(taxRate * 100).toFixed(1)}%)</span>
                <span className="font-semibold">{formatPrice(calculateTaxAmount(subtotal))}</span>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between text-lg">
              <span className="font-semibold">Total</span>
              <span className="font-bold">{formatPrice(total)}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
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

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Add notes about this appointment"
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 border-t flex flex-col space-y-4">
        {!isExistingAppointment && (
          <div className="w-full flex justify-between">
            <Button variant="outline" onClick={() => onBackToServices()}>
              Continue Shopping
            </Button>
            <Button 
              className="w-1/2" 
              onClick={handleServicePayment}
            >
              Complete Payment
            </Button>
          </div>
        )}

        {/* We've removed the actions here and moved them to AppointmentManager */}
      </div>
    </div>
  );
};
