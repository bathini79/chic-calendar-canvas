
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AdminRoute } from "@/components/auth/AdminRoute";
import CustomerLayout from "@/layouts/CustomerLayout";
import Home from "@/pages/customer/Home";
import Services from "@/pages/customer/Services";
import Packages from "@/pages/customer/Packages";
import Cart from "@/pages/customer/Cart";
import Profile from "@/pages/customer/Profile";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminServices from "@/pages/admin/AdminServices";
import Staff from "@/pages/admin/Staff";
import Inventory from "@/pages/admin/Inventory";
import Auth from "./pages/Auth";
import UnifiedScheduling from "./pages/customer/UnifiedScheduling";
import BookingConfirmation from "./pages/customer/BookingConfirmation";
import AdminBookings from "./pages/admin/AdminBookings";
import Settings from "./pages/admin/Settings";
import BusinessSetup from "./pages/admin/settings/BusinessSetup";
import Sales from "./pages/admin/settings/Sales";
import Reports from "./pages/admin/Reports";
import Memberships from "./pages/admin/settings/Memberships";
import LoyaltyProgram from "./pages/admin/settings/LoyaltyProgram";

// 1) Import DnD
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

export default function App() {
  return (
    <BrowserRouter>
      {/* 2) Wrap all <Routes> (or at least admin routes) with DndProvider */}
      <DndProvider backend={HTML5Backend}>
        <Routes>
          {/* Customer Routes */}
          <Route path="/" element={<CustomerLayout />}>
            <Route index element={<Home />} />
            <Route path="services" element={<Services />} />
            <Route path="packages" element={<Packages />} />
            <Route path="cart" element={<Cart />} />
            <Route path="profile" element={<Profile />} />
            <Route path="schedule" element={<UnifiedScheduling />} />
            <Route path="booking-confirmation" element={<BookingConfirmation />} />
          </Route>

          <Route path="/auth" element={<Auth />} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="staff" element={<Staff />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/business-setup" element={<BusinessSetup />} />
            <Route path="settings/business-setup/*" element={<BusinessSetup />} />
            <Route path="settings/sales" element={<Sales />} />
            <Route path="settings/sales/*" element={<Sales />} />
            <Route path="settings/sales/memberships" element={<Memberships />} />
            <Route path="settings/sales/loyalty-program" element={<LoyaltyProgram />} />
          </Route>
        </Routes>
      </DndProvider>
    </BrowserRouter>
  );
}
