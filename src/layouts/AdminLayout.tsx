
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/admin/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
