
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
        name: extraData?.name || "",
        price: extraData?.price || extraData?.selling_price || 0,
        duration: extraData?.duration || 0,
        type: serviceId ? 'service' : 'package'
      };

      if (serviceId) {
        // Add service data
        newItem = {
          ...newItem,
          service_id: serviceId,
          service: extraData,
          // Use provided price or selling_price
          price: extraData?.selling_price || extraData?.price || 0,
          name: extraData?.name || "",
          duration: extraData?.duration || 0,
          ...(extraData && { ...extraData })
        };
      } else if (packageId) {
        // Add package data
        newItem = {
          ...newItem,
          package_id: packageId,
          package: extraData,
          // Use provided price
          price: extraData?.price || 0,
          name: extraData?.name || "",
          duration: extraData?.duration || 0,
          // Handle customized services
          customized_services: extraData?.customized_services || [],
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
      // Calculate price based on available fields
      let itemPrice = 0;
      
      if (item.selling_price !== undefined) {
        itemPrice = item.selling_price;
      } else if (item.service?.selling_price !== undefined) {
        itemPrice = item.service.selling_price;
      } else if (item.package?.price !== undefined) {
        itemPrice = item.package.price;
      } else {
        itemPrice = item.price || 0;
      }
      
      // Handle customized package additional services
      if (item.type === 'package' && item.customized_services && item.customized_services.length > 0) {
        // Additional price calculation for customized services would go here
        // This would require access to the service details, which might need to be stored with the item
      }
      
      return total + itemPrice;
    }, 0);
  };

  const getTotalDuration = () => {
    return items.reduce((total, item) => {
      let itemDuration = 0;
      
      if (item.duration !== undefined) {
        itemDuration = item.duration;
      } else if (item.service?.duration !== undefined) {
        itemDuration = item.service.duration;
      } else if (item.package?.duration !== undefined) {
        itemDuration = item.package.duration;
      }
      
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
