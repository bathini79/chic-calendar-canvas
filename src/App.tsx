import React, { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/admin/Dashboard';
import AdminBookings from '@/pages/admin/AdminBookings';
import AdminServices from '@/pages/admin/AdminServices';
import Staff from '@/pages/admin/Staff';
import Inventory from '@/pages/admin/Inventory';
import Reports from '@/pages/admin/Reports';
import Settings from '@/pages/admin/Settings';
import Home from '@/pages/customer/Home';
import Services from '@/pages/customer/Services';
import Packages from '@/pages/customer/Packages';
import UnifiedScheduling from '@/pages/customer/UnifiedScheduling';
import BookingConfirmation from '@/pages/customer/BookingConfirmation';
import Cart from '@/pages/customer/Cart';
import Profile from '@/pages/customer/Profile';
import ProfileDetails from '@/pages/customer/ProfileDetails';
import UserDetails from '@/pages/customer/UserDetails';
import AdminLayout from '@/layouts/AdminLayout';
import CustomerLayout from '@/layouts/CustomerLayout';
import { useUser } from '@/hooks/useUser';
import { useToast } from "@/components/ui/use-toast"
import { Toast } from "@/components/ui/toast"
import VerificationPage from '@/pages/verify';

const queryClient = new QueryClient();

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/verify" element={<VerificationPage />} />
          
          {/* Admin routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="staff" element={<Staff />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          {/* Customer routes */}
          <Route path="/customer" element={<CustomerLayout />}>
            <Route index element={<Navigate to="/customer/home" />} />
            <Route path="home" element={<Home />} />
            <Route path="services" element={<Services />} />
            <Route path="packages" element={<Packages />} />
            <Route path="booking" element={<UnifiedScheduling />} />
            <Route path="confirmation" element={<BookingConfirmation />} />
            <Route path="cart" element={<Cart />} />
            <Route path="profile" element={<Profile />} />
            <Route path="profile/details" element={<ProfileDetails />} />
            <Route path="profile/user-details" element={<UserDetails />} />
          </Route>
        </Routes>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
