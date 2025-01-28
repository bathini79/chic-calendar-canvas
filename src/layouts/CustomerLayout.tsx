import { CustomerNavbar } from "@/components/customer/CustomerNavbar";
import { CartProvider } from "@/components/cart/CartContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Toaster } from "@/components/ui/sonner";
import { Outlet } from "react-router-dom";

export default function CustomerLayout() {
  return (
    <CartProvider>
      <div className="min-h-screen bg-background">
        <CustomerNavbar />
        <main>
          <Outlet />
        </main>
        <CartDrawer />
        <Toaster />
      </div>
    </CartProvider>
  );
}