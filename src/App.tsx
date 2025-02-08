
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer Routes */}
        <Route path="/" element={<CustomerLayout />}>
          <Route index element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="packages" element={<Packages />} />
          <Route path="cart" element={<Cart />} />
          <Route path="profile" element={<Profile />} />
          <Route path="schedule" element={<UnifiedScheduling />} />
        </Route>

        <Route path="/auth" element={<Auth />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="staff" element={<Staff />} />
          <Route path="inventory" element={<Inventory />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
