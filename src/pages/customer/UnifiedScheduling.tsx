import React, { useState, useEffect } from "react";
import { ServiceSelector } from "@/components/scheduling/ServiceSelector";
import { useCart } from "@/components/cart/CartContext";
import { CartSummary } from "@/components/cart/CartSummary";

export default function UnifiedScheduling() {
  const { selectedStylists, setSelectedStylists, selectedLocation } = useCart();

  const handleStylistSelect = (serviceId: string, stylistId: string) => {
    setSelectedStylists(prev => ({
      ...prev,
      [serviceId]: stylistId
    }));
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Schedule Your Appointment</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-8">
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Select Service Provider</h2>
              <ServiceSelector
                onStylistSelect={handleStylistSelect}
                locationId={selectedLocation}
              />
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
