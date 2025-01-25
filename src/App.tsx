import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AdminLayout } from "@/layouts/AdminLayout";
import { CustomerLayout } from "@/layouts/CustomerLayout";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { queryClient } from "@/lib/react-query";
import { CartProvider } from "@/components/cart/CartContext";

// Auth Page
import Auth from "@/pages/Auth";

// Admin Pages
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminServices from "@/pages/admin/AdminServices";
import Staff from "@/pages/admin/Staff";
import Index from "@/pages/admin/Index";

// Customer Pages
import Home from "@/pages/customer/Home";
import Services from "@/pages/customer/Services";
import BookingForm from "@/pages/customer/BookingForm";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <Router>
          <Routes>
            {/* Auth Route */}
            <Route path="/auth" element={<Auth />} />

            {/* Customer Routes */}
            <Route element={<CustomerLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/services" element={<Services />} />
              <Route path="/book/service/:id" element={<BookingForm />} />
              <Route path="/book/package/:id" element={<BookingForm />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<Index />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="services" element={<AdminServices />} />
                <Route path="staff" element={<Staff />} />
              </Route>
            </Route>

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </Router>
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;