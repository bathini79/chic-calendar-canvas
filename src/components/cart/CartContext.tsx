import React, { createContext, useContext, useState, ReactNode } from "react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  duration?: number;
  type: 'service' | 'package';
  service?: any;
  service_id?: string;
  package?: any;
  package_id?: string;
  selling_price?: number;
  customized_services?: string[];
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  selectedTimeSlots: Record<string, string>;
  setSelectedTimeSlots: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  selectedDate: Date | null;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date | null>>;
  selectedStylists: Record<string, string>;
  setSelectedStylists: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  selectedLocation: string;
  setSelectedLocation: React.Dispatch<React.SetStateAction<string>>;
  appliedTaxId: string | null;
  setAppliedTaxId: React.Dispatch<React.SetStateAction<string | null>>;
  appliedCouponId: string | null;
  setAppliedCouponId: React.Dispatch<React.SetStateAction<string | null>>;
  // Add missing methods
  addToCart: (serviceId?: string, packageId?: string, extraData?: any) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  getTotalPrice: () => number;
  getTotalDuration: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStylists, setSelectedStylists] = useState<Record<string, string>>({});
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [appliedTaxId, setAppliedTaxId] = useState<string | null>(null);
  const [appliedCouponId, setAppliedCouponId] = useState<string | null>(null);

  const addItem = (item: CartItem) => {
    // Check if item already exists
    const existingItem = items.find((i) => i.id === item.id);
    if (existingItem) return;
    
    setItems([...items, item]);
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId));
    
    // Also remove from selected time slots and stylists
    const updatedTimeSlots = { ...selectedTimeSlots };
    delete updatedTimeSlots[itemId];
    setSelectedTimeSlots(updatedTimeSlots);
    
    const updatedStylists = { ...selectedStylists };
    delete updatedStylists[itemId];
    setSelectedStylists(updatedStylists);
  };

  // Implement new methods
  const addToCart = async (serviceId?: string, packageId?: string, extraData?: any) => {
    try {
      // Generate a unique ID for the cart item
      const itemId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      let newItem: CartItem = {
        id: itemId,
        name: "",
        price: 0,
        type: serviceId ? 'service' : 'package'
      };

      if (serviceId) {
        // For services
        const serviceName = extraData?.service?.name || extraData?.name || "";
        const servicePrice = extraData?.service?.selling_price || extraData?.selling_price || extraData?.price || 0;
        const serviceDuration = extraData?.service?.duration || extraData?.duration || 0;
        
        newItem = {
          ...newItem,
          name: serviceName,
          price: servicePrice,
          duration: serviceDuration,
          service_id: serviceId,  // Store the actual service ID for time slot reference
          service: extraData?.service || null,
          selling_price: servicePrice,
          // Add service data if available
          ...(extraData && { ...extraData })
        };
      } else if (packageId) {
        // For packages
        const packageName = extraData?.package?.name || extraData?.name || "";
        const packagePrice = extraData?.selling_price || extraData?.price || extraData?.package?.price || 0;
        const packageDuration = extraData?.duration || extraData?.package?.duration || 0;
        
        newItem = {
          ...newItem,
          name: packageName,
          price: packagePrice,
          duration: packageDuration,
          package_id: packageId,  // Store the actual package ID for time slot reference
          package: extraData?.package || null,
          selling_price: packagePrice,
          // Add package data if available
          ...(extraData && { ...extraData })
        };
      }

      setItems(prev => [...prev, newItem]);
      return Promise.resolve();
    } catch (error) {
      console.error("Error adding to cart:", error);
      return Promise.reject(error);
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      removeItem(itemId);
      return Promise.resolve();
    } catch (error) {
      console.error("Error removing from cart:", error);
      return Promise.reject(error);
    }
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => {
      // Use the most specific price available
      const itemPrice = item.selling_price !== undefined
        ? item.selling_price
        : item.price !== undefined
          ? item.price
          : item.service?.selling_price || item.package?.price || 0;
      
      return total + itemPrice;
    }, 0);
  };

  const getTotalDuration = () => {
    return items.reduce((total, item) => {
      // Use the most specific duration available
      const itemDuration = item.duration !== undefined
        ? item.duration
        : item.service?.duration || item.package?.duration || 0;
      
      return total + itemDuration;
    }, 0);
  };

  const clearCart = () => {
    setItems([]);
    setSelectedTimeSlots({});
    setSelectedStylists({});
    setSelectedDate(null);
    setAppliedTaxId(null);
    setAppliedCouponId(null);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearCart,
        selectedTimeSlots,
        setSelectedTimeSlots,
        selectedDate,
        setSelectedDate,
        selectedStylists,
        setSelectedStylists,
        selectedLocation,
        setSelectedLocation,
        appliedTaxId,
        setAppliedTaxId,
        appliedCouponId,
        setAppliedCouponId,
        // Add new methods to context
        addToCart,
        removeFromCart,
        getTotalPrice,
        getTotalDuration
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
