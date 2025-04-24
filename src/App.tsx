import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import  AdminLayout  from "@/layouts/AdminLayout";
import { AdminRoute } from "@/components/auth/AdminRoute";
import CustomerLayout from "@/layouts/CustomerLayout";
import Home from "@/pages/customer/Home";
import Services from "@/pages/customer/Services";
import Packages from "@/pages/customer/Packages";
import Cart from "@/pages/customer/Cart";
import Profile from "@/pages/customer/Profile";
import UserDetails from "@/pages/customer/UserDetails";
import ProfileDetails from "@/pages/customer/ProfileDetails";
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
import ThirdParty from "./pages/admin/settings/ThirdParty";
import Team from "./pages/admin/settings/Team";
import Reports from "./pages/admin/Reports";
import VerifyEmployeePage from "./pages/verify";
import { Toaster } from "@/components/ui/sonner"; // Import the Sonner Toaster

import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { UserStatus } from "./components/auth/UserStatus";
import VerificationPage from "./pages/verify";
import CustomerVerification from "./components/verification/CustomerVerification";

export default function App() {
  return (
    <BrowserRouter>
      {/* Add UserStatus component for persistent auth state */}
      <UserStatus />
      
      {/* Add Sonner Toaster for consistent toast notifications */}
      <Toaster position="top-right" />
      
      {/* Wrap all routes with DndProvider */}
      <DndProvider backend={HTML5Backend}>
        <Routes>
        <Route path="/" element={<Auth />} />
          <Route path="/verify" element={<VerificationPage />} />
          <Route path="/customer-verify" element={<CustomerVerification />} />
          {/* Customer Routes */}
          <Route path="/" element={<Navigate to="/services" replace />} />
          <Route path="/" element={<CustomerLayout />}>
            <Route path="services" element={<Services />} />
            <Route path="packages" element={<Packages />} />
            <Route path="cart" element={<Cart />} />
            <Route path="profile" element={<Profile />} />
            <Route path="profile/details" element={<ProfileDetails />} />
            <Route path="schedule" element={<UnifiedScheduling />} />
            <Route path="booking-confirmation" element={<BookingConfirmation />} />
            <Route path="wallet" element={<ProfileDetails />} />
            <Route path="favourites" element={<ProfileDetails />} />
            <Route path="forms" element={<ProfileDetails />} />
            <Route path="orders" element={<ProfileDetails />} />
            <Route path="settings" element={<ProfileDetails />} />
          </Route>

          <Route path="/auth" element={<Auth />} />
          
          {/* Verification Routes */}
          <Route path="/verify" element={<CustomerVerification />} />
          <Route path="/verify-employee" element={<VerifyEmployeePage />} />

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
            <Route path="settings/third-party" element={<ThirdParty />} />
            <Route path="settings/third-party/*" element={<ThirdParty />} />
            <Route path="settings/team" element={<Team />} />
            <Route path="settings/team/*" element={<Team />} />
          </Route>
        </Routes>
      </DndProvider>
    </BrowserRouter>
  );
}
