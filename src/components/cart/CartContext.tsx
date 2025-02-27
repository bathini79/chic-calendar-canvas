
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
    id: string;
    name: string;
    selling_price: number;
    duration: number;
  };
  package?: {
    id: string;
    name: string;
    price: number;
    duration: number;
    package_services: Array<{
      service: {
        id: string;
        name: string;
        selling_price: number;
        duration: number;
      };
    }>;
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
  setSelectedTimeSlots: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  selectedStylists: Record<string, string>;
  setSelectedStylists: React.Dispatch<React.SetStateAction<Record<string, string>>>;
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
  const [allServices, setAllServices] = useState<any[]>([]);

  useEffect(() => {
    fetchCartItems();
    fetchAllServices();

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

  const fetchAllServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('status', 'active');
      
    if (error) {
      console.error('Error fetching services:', error);
      return;
    }
    
    if (data) {
      setAllServices(data);
    }
  };

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
        service:services(
          id,
          name,
          selling_price,
          duration
        ),
        package:packages!cart_items_package_id_fkey(
          id,
          name,
          price,
          duration,
          package_services(
            service:services(
              id,
              name,
              selling_price,
              duration
            )
          )
        )
      `)
      .eq('status', 'pending')
      .eq('customer_id', session.session.user.id);

    if (error) {
      toast.error("Error fetching cart items");
      return;
    }

    const typedCartItems = cartItems as CartItem[];
    setItems(typedCartItems);
    setIsLoading(false);
  };

  const calculateItemPrice = (item: CartItem): number => {
    if (item.service) {
      return item.service.selling_price;
    } else if (item.package) {
      let totalPrice = item.package.price;

      // Add prices for customized services
      if (item.customized_services?.length && allServices.length > 0) {
        item.customized_services.forEach(serviceId => {
          // Check if this service is not already in the package
          const isInPackage = item.package?.package_services.some(ps => ps.service.id === serviceId);
          if (!isInPackage) {
            // Find the service in the complete list of all services
            const customService = allServices.find(s => s.id === serviceId);
            if (customService) {
              totalPrice += customService.selling_price;
            }
          }
        });
      }

      return totalPrice;
    }
    return 0;
  };

  const calculateItemDuration = (item: CartItem): number => {
    if (item.service) {
      return item.service.duration;
    } else if (item.package) {
      let totalDuration = 0;

      // Add base package services duration
      item.package.package_services.forEach(ps => {
        totalDuration += ps.service.duration;
      });

      // Add duration for customized services
      if (item.customized_services?.length && allServices.length > 0) {
        item.customized_services.forEach(serviceId => {
          // Check if this service is not already in the package
          const isInPackage = item.package?.package_services.some(ps => ps.service.id === serviceId);
          if (!isInPackage) {
            // Find the service in the complete list of all services
            const customService = allServices.find(s => s.id === serviceId);
            if (customService) {
              totalDuration += customService.duration;
            }
          }
        });
      }

      return totalDuration;
    }
    return 0;
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + calculateItemPrice(item), 0);
  };

  const getTotalDuration = () => {
    return items.reduce((total, item) => total + calculateItemDuration(item), 0);
  };

  const addToCart = async (
    serviceId?: string, 
    packageId?: string, 
    options?: { 
      customized_services?: string[], 
      selling_price?: number 
    }
  ) => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast.error("Please sign in to add items to cart");
      return;
    }

    const cartItem = {
      service_id: serviceId,
      package_id: packageId,
      status: 'pending' as const,
      customer_id: session.session.user.id,
      customized_services: options?.customized_services || [],
      selling_price: options?.selling_price || 0
    };

    const { error } = await supabase
      .from('cart_items')
      .insert([cartItem]);

    if (error) {
      toast.error("Error adding item to cart");
      return;
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
