
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/admin/AppSidebar";
import { AddButton } from "@/components/admin/components/AddButton";

export function AdminLayout() {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1">
        <div className="fixed top-4 right-4 z-50">
          <AddButton />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
