import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AdminLayout } from "@/layouts/AdminLayout";
import CustomerLayout from "@/layouts/CustomerLayout";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { queryClient } from "@/lib/react-query";
import Services from "@/pages/customer/Services";
import Schedule from "@/pages/customer/Schedule";
import Appointments from "@/pages/customer/Appointments";
import Categories from "@/pages/admin/Categories";
import AdminServices from "@/pages/admin/Services";
import Packages from "@/pages/admin/Packages";
import Employees from "@/pages/admin/Employees";
import Shifts from "@/pages/admin/Shifts";
import Locations from "@/pages/admin/Locations";
import Bookings from "@/pages/admin/Bookings";
import Dashboard from "@/pages/admin/Dashboard";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CustomerLayout />}>
            <Route index element={<Services />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="appointments" element={<Appointments />} />
          </Route>
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="categories" element={<Categories />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="packages" element={<Packages />} />
            <Route path="employees" element={<Employees />} />
            <Route path="shifts" element={<Shifts />} />
            <Route path="locations" element={<Locations />} />
            <Route path="bookings" element={<Bookings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}