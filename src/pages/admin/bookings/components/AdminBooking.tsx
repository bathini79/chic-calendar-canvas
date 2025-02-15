
import React, { useState } from "react";
import { CustomerSearch } from "./CustomerSearch";
import { ServiceSelector } from "./ServiceSelector";
import { Badge } from "@/components/ui/badge";
import type { Customer } from "../types";

export function AdminBooking() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      }
      return [...prev, serviceId];
    });
  };

  const handlePackageSelect = (packageId: string, services: string[]) => {
    setSelectedPackages(prev => {
      if (prev.includes(packageId)) {
        return prev.filter(id => id !== packageId);
      }
      return [...prev, packageId];
    });
    setSelectedServices(prev => [...prev, ...services]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="grid grid-cols-5 gap-8">
        {/* Customer Section - 40% */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Customer</h2>
            {selectedCustomer && (
              <Badge variant="outline" className="text-sm">
                Selected: {selectedCustomer.full_name}
              </Badge>
            )}
          </div>
          <CustomerSearch onSelect={handleCustomerSelect} />
        </div>

        {/* Services Section - 60% */}
        <div className="col-span-3 space-y-4">
          <h2 className="text-2xl font-bold">Services & Packages</h2>
          <ServiceSelector
            onServiceSelect={handleServiceSelect}
            onPackageSelect={handlePackageSelect}
            selectedServices={selectedServices}
            selectedPackages={selectedPackages}
          />
        </div>
      </div>
    </div>
  );
}
