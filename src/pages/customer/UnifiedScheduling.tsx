
import React, { useState } from "react";
import { ServiceSelector } from "@/components/scheduling/ServiceSelector";
import { useCart } from "@/components/cart/CartContext";
import { CartSummary } from "@/components/cart/CartSummary";

export default function UnifiedScheduling() {
  const { 
    selectedLocation,
    items,
    addToCart,
    removeFromCart
  } = useCart();
  
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [cartItemId, setCartItemId] = useState<string | null>(null);

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Schedule Your Appointment</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-8">
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Select Service Provider</h2>
              <ServiceSelector 
                selectedServices={selectedServices}
                selectedPackages={selectedPackages}
                onServicesChange={setSelectedServices}
                onPackagesChange={setSelectedPackages}
                locationId={selectedLocation}
                refreshCart={() => {}}
                cartItemId={cartItemId}
                setCartItemId={setCartItemId}
                selectedPackage={null}
                selectedCardToCustomize={null}
                onSelectedCardToCustomizeChange={() => {}}
                isCustomizing={false}
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
