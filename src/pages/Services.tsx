import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, Plus } from "lucide-react";
import { ServicesGrid } from "@/components/services/ServicesGrid";
import { ServicesList } from "@/components/services/ServicesList";

const Services = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1">
          <div className="container mx-auto py-4 md:py-8 space-y-4 md:space-y-8 px-2 md:px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="text-2xl font-bold">Services</h1>
              </div>
              <div className="flex items-center gap-2">
                <div className="border rounded-md p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewMode('grid')}
                    className={viewMode === 'grid' ? 'bg-secondary' : ''}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewMode('list')}
                    className={viewMode === 'list' ? 'bg-secondary' : ''}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              </div>
            </div>
            {viewMode === 'grid' ? <ServicesGrid /> : <ServicesList />}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Services;