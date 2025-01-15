import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, Plus, Search, Scissors } from "lucide-react";
import { ServicesGrid } from "@/components/services/ServicesGrid";
import { ServicesList } from "@/components/services/ServicesList";
import { ServiceDialog } from "@/components/services/ServiceDialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CategoriesList from "@/components/categories/CategoriesList";
import { CategoryDialog } from "@/components/categories/CategoryDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const Services = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  const { data: categories, refetch: refetchCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const handleEditService = (service: any) => {
    setSelectedService(service);
    setServiceDialogOpen(true);
  };

  const handleCreateService = () => {
    setSelectedService(null);
    setServiceDialogOpen(true);
  };

  const handleEditCategory = (category: any) => {
    setSelectedCategory(category);
    setCategoryDialogOpen(true);
  };

  const handleCreateCategory = () => {
    setSelectedCategory(null);
    setCategoryDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-8 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex flex-col space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Services Management</h1>
        </div>

        <Tabs defaultValue="services" className="w-full">
          <div className="flex flex-col space-y-6">
            <TabsList className="w-full sm:w-auto justify-start border-b">
              <TabsTrigger 
                value="services" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-8"
              >
                <Scissors className="h-4 w-4 mr-2" />
                Services
              </TabsTrigger>
              <TabsTrigger 
                value="categories"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-8"
              >
                <List className="h-4 w-4 mr-2" />
                Categories
              </TabsTrigger>
            </TabsList>

            <TabsContent value="services" className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-card p-4 rounded-lg shadow-sm">
                <div className="relative w-full sm:w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-full"
                  />
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className={cn(
                        "gap-2",
                        viewMode === 'grid' && "bg-background shadow-sm"
                      )}
                    >
                      <LayoutGrid className="h-4 w-4" />
                      <span className="hidden sm:inline">Grid View</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className={cn(
                        "gap-2",
                        viewMode === 'list' && "bg-background shadow-sm"
                      )}
                    >
                      <List className="h-4 w-4" />
                      <span className="hidden sm:inline">List View</span>
                    </Button>
                  </div>
                  <Button 
                    onClick={handleCreateService}
                    className="gap-2 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <Plus className="h-4 w-4" />
                    Add Service
                  </Button>
                </div>
              </div>

              {viewMode === 'grid' ? (
                <ServicesGrid searchQuery={searchQuery} onEdit={handleEditService} />
              ) : (
                <ServicesList searchQuery={searchQuery} onEdit={handleEditService} />
              )}
            </TabsContent>

            <TabsContent value="categories" className="space-y-6">
              <div className="flex justify-end">
                <Button 
                  onClick={handleCreateCategory}
                  className="gap-2 shadow-sm hover:shadow-md transition-shadow"
                >
                  <Plus className="h-4 w-4" />
                  Add Category
                </Button>
              </div>
              {categories && (
                <CategoriesList
                  categories={categories}
                  onEdit={handleEditCategory}
                  onDelete={refetchCategories}
                />
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <ServiceDialog
        open={serviceDialogOpen}
        onOpenChange={setServiceDialogOpen}
        initialData={selectedService}
      />
      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={selectedCategory}
        onSuccess={refetchCategories}
      />
    </div>
  );
};

export default Services;