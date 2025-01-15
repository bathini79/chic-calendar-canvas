import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List } from "lucide-react";
import { ServicesGrid } from "@/components/services/ServicesGrid";
import { ServicesList } from "@/components/services/ServicesList";
import { ServiceDialog } from "@/components/services/ServiceDialog";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { ServicesHeader } from "@/components/services/ServicesHeader";
import { ViewToggle } from "@/components/services/ViewToggle";
import { SearchInput } from "@/components/services/SearchInput";
import CategoriesList from "@/components/categories/CategoriesList";
import CategoriesGrid from "@/components/categories/CategoriesGrid";
import { CategoryDialog } from "@/components/categories/CategoryDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      <ServicesHeader onCreateClick={handleCreateService} />

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

          <TabsContent value="services">
            <CollapsibleSection title="Services Management">
              <div className="flex flex-col sm:flex-row gap-4">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                />
                <div className="flex gap-2 items-center justify-between sm:justify-end">
                  <ViewToggle
                    view={viewMode}
                    onViewChange={setViewMode}
                  />
                </div>
              </div>

              {viewMode === 'grid' ? (
                <ServicesGrid searchQuery={searchQuery} onEdit={handleEditService} />
              ) : (
                <ServicesList searchQuery={searchQuery} onEdit={handleEditService} />
              )}
            </CollapsibleSection>
          </TabsContent>

          <TabsContent value="categories">
            <CollapsibleSection title="Categories Management">
              <div className="flex flex-col sm:flex-row gap-4">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search categories..."
                />
                <div className="flex gap-2 items-center justify-between sm:justify-end">
                  <ViewToggle
                    view={categoryViewMode}
                    onViewChange={setCategoryViewMode}
                  />
                </div>
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
            </CollapsibleSection>
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