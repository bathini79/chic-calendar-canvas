import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List } from "lucide-react";
import { SearchInput } from "@/components/services/components/SearchInput";
import { HeaderActions } from "@/components/services/components/HeaderActions";
import { ServicesContent } from "@/components/services/components/ServicesContent";
import { ServiceDialog } from "@/components/services/ServiceDialog";
import { CategoryDialog } from "@/components/categories/CategoryDialog";
import CategoriesList from "@/components/categories/CategoriesList";
import CategoriesGrid from "@/components/categories/CategoriesGrid";

const Services = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [categoryViewMode, setCategoryViewMode] = useState<'grid' | 'list'>('grid');
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
    <div className="w-full min-h-screen bg-background p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Services</h1>
      </div>

      <Tabs defaultValue="services" className="w-full">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center border-b">
            <TabsList className="bg-transparent h-auto p-0">
              <TabsTrigger 
                value="services" 
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 pb-3 flex items-center gap-2"
              >
                <LayoutGrid className="h-4 w-4" />
                Services
              </TabsTrigger>
              <TabsTrigger 
                value="categories" 
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 pb-3 flex items-center gap-2"
              >
                <List className="h-4 w-4" />
                Categories
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="services" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search services..."
                />
              </div>
              <HeaderActions
                view={viewMode}
                onViewChange={setViewMode}
                onCreateClick={handleCreateService}
              />
            </div>

            <ServicesContent
              view={viewMode}
              searchQuery={searchQuery}
              onEdit={handleEditService}
            />
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <SearchInput
                  value=""
                  onChange={() => {}}
                  placeholder="Search categories..."
                />
              </div>
              <HeaderActions
                view={categoryViewMode}
                onViewChange={setCategoryViewMode}
                onCreateClick={handleCreateCategory}
              />
            </div>
            {categories && categoryViewMode === 'grid' ? (
              <CategoriesGrid
                categories={categories}
                onEdit={handleEditCategory}
                onDelete={refetchCategories}
              />
            ) : (
              <CategoriesList
                categories={categories || []}
                onEdit={handleEditCategory}
                onDelete={refetchCategories}
              />
            )}
          </TabsContent>
        </div>
      </Tabs>

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