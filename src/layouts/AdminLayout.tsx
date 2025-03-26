
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/admin/AppSidebar";

export function AdminLayout() {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
