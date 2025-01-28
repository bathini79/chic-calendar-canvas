import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type CartItem = {
  id: string;
  service_id?: string;
  package_id?: string;
  status: 'pending' | 'scheduled' | 'removed';
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
};

type CartContextType = {
  items: CartItem[];
  addToCart: (serviceId?: string, packageId?: string) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  isLoading: boolean;
  setCartOpen: (open: boolean) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    fetchCartItems();

    // Subscribe to real-time updates
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

  const addToCart = async (serviceId?: string, packageId?: string) => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast.error("Please sign in to add items to cart");
      return;
    }

    // First check if the item already exists in cart
    const existingItem = items.find(item => 
      (serviceId && item.service_id === serviceId) || 
      (packageId && item.package_id === packageId)
    );

    if (existingItem) {
      // If it exists, update its status back to pending if it was removed
      const { error } = await supabase
        .from('cart_items')
        .update({ status: 'pending' })
        .eq('id', existingItem.id);

      if (error) {
        toast.error("Error updating cart item");
        return;
      }
    } else {
      // If it doesn't exist, insert a new item
      const { error } = await supabase
        .from('cart_items')
        .insert([
          {
            service_id: serviceId,
            package_id: packageId,
            status: 'pending',
            customer_id: session.session.user.id,
          },
        ]);

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

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, isLoading, setCartOpen }}>
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