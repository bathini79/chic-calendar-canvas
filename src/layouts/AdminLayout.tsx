
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/admin/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useIsMobile();

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  return (
    <SidebarProvider defaultOpen={!isMobile} open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="flex min-h-screen w-full">
        <AppSidebar open={sidebarOpen} />
        <main className="flex-1 overflow-hidden">
          {isMobile && (
            <div className="p-2 border-b">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </div>
          )}
          <div className="p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
