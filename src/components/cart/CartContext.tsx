import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type CartItem = {
  id: string;
  service_id?: string;
  package_id?: string;
  status: 'pending' | 'scheduled' | 'removed';
  customized_services?: string[];
  service?: {
    name: string;
    selling_price: number;
    duration: number;
  };
  package?: {
    name: string;
    price: number;
    duration: number;
  };
  selling_price: number;
};

type CartContextType = {
  items: CartItem[];
  addToCart: (serviceId?: string, packageId?: string, options?: { customized_services?: string[], selling_price?: number }) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  isLoading: boolean;
  setCartOpen: (open: boolean) => void;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  selectedTimeSlots: Record<string, string>;
  setSelectedTimeSlots: (slots: Record<string, string>) => void;
  selectedStylists: Record<string, string>;
  setSelectedStylists: (stylists: Record<string, string>) => void;
  getTotalPrice: () => number;
  getTotalDuration: () => number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<Record<string, string>>({});
  const [selectedStylists, setSelectedStylists] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCartItems();

    const channel = supabase
      .channel('cart-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
        },
        () => {
          fetchCartItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCartItems = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      setIsLoading(false);
      return;
    }

    const { data: cartItems, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        service:services(*),
        package:packages(*)
      `)
      .eq('status', 'pending')
      .eq('customer_id', session.session.user.id);

    if (error) {
      toast.error("Error fetching cart items");
      return;
    }

    setItems(cartItems);
    setIsLoading(false);
  };

  const addToCart = async (serviceId?: string, packageId?: string, options?: { customized_services?: string[], selling_price?: number }) => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast.error("Please sign in to add items to cart");
      return;
    }

    const existingItem = items.find(item => 
      (serviceId && item.service_id === serviceId) || 
      (packageId && item.package_id === packageId)
    );

    const cartItem = {
      service_id: serviceId,
      package_id: packageId,
      status: 'pending',
      customer_id: session.session.user.id,
      customized_services: options?.customized_services || [],
      selling_price: options?.selling_price || 0
    };

    if (existingItem) {
      const { error } = await supabase
        .from('cart_items')
        .update(cartItem)
        .eq('id', existingItem.id);

      if (error) {
        toast.error("Error updating cart item");
        return;
      }
    } else {
      const { error } = await supabase
        .from('cart_items')
        .insert([cartItem]);

      if (error) {
        toast.error("Error adding item to cart");
        return;
      }
    }

    await fetchCartItems();
  };

  const removeFromCart = async (itemId: string) => {
    const { error } = await supabase
      .from('cart_items')
      .update({ status: 'removed' })
      .eq('id', itemId);

    if (error) {
      toast.error("Error removing item from cart");
      return;
    }

    await fetchCartItems();
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => {
      return total + (item.service?.selling_price || item.package?.price || 0);
    }, 0);
  };

  const getTotalDuration = () => {
    return items.reduce((total, item) => {
      return total + (item.service?.duration || item.package?.duration || 0);
    }, 0);
  };

  return (
    <CartContext.Provider value={{ 
      items, 
      addToCart, 
      removeFromCart, 
      isLoading, 
      setCartOpen,
      selectedDate,
      setSelectedDate,
      selectedTimeSlots,
      setSelectedTimeSlots,
      selectedStylists,
      setSelectedStylists,
      getTotalPrice,
      getTotalDuration
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
