
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/admin/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
