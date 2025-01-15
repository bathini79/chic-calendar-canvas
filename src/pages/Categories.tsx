import CategoriesList from "@/components/categories/CategoriesList";
import { CategoryDialog } from "@/components/categories/CategoryDialog";
import { SidebarProvider, SidebarInset, SidebarRail } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useState } from "react";

const Categories = () => {
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <SidebarRail />
        <SidebarInset className="flex-1">
          <div className="container mx-auto p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Categories</h1>
              <CategoryDialog 
                open={open} 
                onOpenChange={setOpen} 
                onSuccess={handleSuccess}
              />
            </div>
            <CategoriesList 
              onEdit={(category) => {
                // Handle edit
              }}
              onDelete={handleSuccess}
              categories={[]} // This will be populated by the component's internal query
            />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Categories;