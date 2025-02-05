import { Routes, Route } from "react-router-dom";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AdminRoute } from "@/components/auth/AdminRoute";
import Dashboard from "./Dashboard";
import AdminServices from "./AdminServices";
import Staff from "./Staff";
import Manage from "./Manage";

export default function AdminIndex() {
  return (
    <AdminRoute>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="staff" element={<Staff />} />
          <Route path="manage" element={<Manage />} />
        </Route>
      </Routes>
    </AdminRoute>
  );
}