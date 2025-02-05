import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AdminLayout } from "@/layouts/AdminLayout";
import CustomerLayout from "@/layouts/CustomerLayout";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { queryClient } from "@/lib/react-query";
import Services from "@/pages/customer/Services";
import UnifiedScheduling from "@/pages/customer/UnifiedScheduling";
import BookingConfirmation from "@/pages/customer/BookingConfirmation";
import AdminServices from "@/pages/admin/AdminServices";
import AdminDashboard from "@/pages/admin/Dashboard";
import Staff from "@/pages/admin/Staff";
import Inventory from "@/pages/admin/Inventory";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Customer Routes */}
          <Route element={<CustomerLayout />}>
            <Route index element={<Services />} />
            <Route path="schedule" element={<UnifiedScheduling />} />
            <Route path="booking-confirmation" element={<BookingConfirmation />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="staff" element={<Staff />} />
            <Route path="inventory" element={<Inventory />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}