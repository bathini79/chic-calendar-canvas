
// Add location selection to CartContext
import React, { createContext, useContext, useState, ReactNode } from "react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  duration?: number;
  type: 'service' | 'package';
  service?: any;
  package?: any;
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
  selectedLocation: string; // Add selectedLocation field
  setSelectedLocation: React.Dispatch<React.SetStateAction<string>>; // Add setSelectedLocation method
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStylists, setSelectedStylists] = useState<Record<string, string>>({});
  const [selectedLocation, setSelectedLocation] = useState<string>(""); // Add state for selected location

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

  const clearCart = () => {
    setItems([]);
    setSelectedTimeSlots({});
    setSelectedStylists({});
    setSelectedDate(null);
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
        selectedLocation,  // Add to context values
        setSelectedLocation  // Add to context values
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
