import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AdminLayout } from "@/layouts/AdminLayout";
import CustomerLayout from "@/layouts/CustomerLayout";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { queryClient } from "@/lib/react-query";
import Services from "@/pages/customer/Services";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CustomerLayout />}>
            <Route index element={<Services />} />
          </Route>
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<div>Dashboard</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}