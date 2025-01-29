import { Outlet } from "react-router-dom";
import { CustomerNavbar } from "@/components/customer/CustomerNavbar";
import { CartProvider } from "@/components/cart/CartContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { useState } from "react";

interface CustomerNavbarProps {
  onCartClick: () => void;
}

export default function CustomerLayout() {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <CartProvider>
      <div className="min-h-screen bg-background">
        <CustomerNavbar onCartClick={() => setCartOpen(true)} />
        <main>
          <Outlet />
        </main>
        <CartDrawer 
          open={cartOpen}
          onOpenChange={setCartOpen}
        />
      </div>
    </CartProvider>
  );
}