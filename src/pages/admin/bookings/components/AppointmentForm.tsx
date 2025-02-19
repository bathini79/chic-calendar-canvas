
import React from "react";
import { Button } from "@/components/ui/button";
import { CustomerSearch } from "./CustomerSearch";
import { ServiceSelector } from "./ServiceSelector";
import { format } from "date-fns"; // Add missing import
import type { Customer } from "../types";

interface AppointmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer) => void;
  onCustomerChange: () => void;
  selectedServices: string[];
  selectedPackages: string[];
  selectedStylists: Record<string, string>;
  employees: any[];
  onServiceSelect: (serviceId: string) => void;
  onPackageSelect: (packageId: string) => void;
  onStylistSelect: (itemId: string, stylistId: string) => void;
  onSave: () => void;
  onProceedToCheckout: () => void;
  clickedCell?: { time: number; date?: Date } | null;
  formatTime: (time: number) => string;
}

export function AppointmentForm({
  isOpen,
  onClose,
  selectedCustomer,
  onCustomerSelect,
  onCustomerChange,
  selectedServices,
  selectedPackages,
  selectedStylists,
  employees,
  onServiceSelect,
  onPackageSelect,
  onStylistSelect,
  onSave,
  onProceedToCheckout,
  clickedCell,
  formatTime
}: AppointmentFormProps) {
  return (
    <div
      className={`fixed top-0 right-0 w-full max-w-6xl h-full bg-white z-50 transform transition-transform duration-300 ease-in-out shadow-xl ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="h-full flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">New Appointment</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          {clickedCell && (
            <p className="text-sm text-muted-foreground mt-1">
              {clickedCell.date && format(clickedCell.date, "MMMM d, yyyy")} at{" "}
              {formatTime(clickedCell.time)}
            </p>
          )}
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-[40%] border-r overflow-y-auto p-6">
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Select Customer</h3>
              {!selectedCustomer ? (
                <CustomerSearch onSelect={onCustomerSelect} />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">
                        {selectedCustomer.full_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedCustomer.email}
                      </p>
                    </div>
                    <button
                      className="text-sm text-gray-600 hover:text-gray-900"
                      onClick={onCustomerChange}
                    >
                      Change Customer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-[60%] overflow-y-auto p-6">
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Select Services</h3>
              <ServiceSelector
                onServiceSelect={onServiceSelect}
                onPackageSelect={onPackageSelect}
                onStylistSelect={onStylistSelect}
                selectedServices={selectedServices}
                selectedPackages={selectedPackages}
                selectedStylists={selectedStylists}
                stylists={employees}
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={onSave}>
                  Save Appointment
                </Button>
                <Button onClick={onProceedToCheckout}>
                  Proceed to Checkout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
