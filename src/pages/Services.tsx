import { useState } from "react";
import { ServicesGrid } from "@/components/services/ServicesGrid";
import { ServiceDialog } from "@/components/services/ServiceDialog";
import { SidebarProvider, SidebarInset, SidebarRail } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const Services = () => {
  const [open, setOpen] = useState(false);

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <SidebarRail />
        <SidebarInset className="flex-1">
          <div className="container mx-auto p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Services</h1>
              <ServiceDialog open={open} onOpenChange={setOpen} />
            </div>
            <ServicesGrid />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Services;