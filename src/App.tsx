import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AdminInventory } from "@/pages/admin/inventory/Index";
import { CustomerLayout } from "@/layouts/CustomerLayout";
import { Dashboard } from "@/pages/admin/Dashboard";
import { AdminServices } from "@/pages/admin/services/Index";
import { Staff } from "@/pages/admin/staff/Index";

const router = createBrowserRouter([
  {
    path: "/",
    element: <CustomerLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "services",
        element: <Services />,
      },
      {
        path: "packages",
        element: <Packages />,
      },
      {
        path: "cart",
        element: <Cart />,
      },
      {
        path: "profile",
        element: <Profile />,
      },
    ],
  },
  {
    path: "/admin",
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "services",
        element: <AdminServices />,
      },
      {
        path: "staff",
        element: <Staff />,
      },
      {
        path: "inventory",
        element: <AdminInventory />,
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}