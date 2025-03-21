
import React, { useState } from "react";
import { ServiceSelector } from "@/components/scheduling/ServiceSelector";
import { useCart } from "@/components/cart/CartContext";
import { CartSummary } from "@/components/cart/CartSummary";

// Define the props interface for ServiceSelector
interface ServiceSelectorProps {
  selectedServices: string[];
  selectedPackages: string[];
  onServicesChange: (services: string[]) => void;
  onPackagesChange: (packages: string[]) => void;
  locationId?: string;
  // Add any other required props based on the ServiceSelector component requirements
}

export default function UnifiedScheduling() {
  const { 
    selectedLocation,
    items,
    addToCart,
    removeFromCart
  } = useCart();
  
  // Create the required props for ServiceSelector
  const serviceSelectorProps: ServiceSelectorProps = {
    selectedServices: [],
    selectedPackages: [],
    onServicesChange: () => {},
    onPackagesChange: () => {},
    locationId: selectedLocation
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Schedule Your Appointment</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-8">
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Select Service Provider</h2>
              <ServiceSelector {...serviceSelectorProps} />
            </div>
          </div>
        </div>
        
        <div className="md:col-span-4">
          <CartSummary />
        </div>
      </div>
    </div>
  );
}
