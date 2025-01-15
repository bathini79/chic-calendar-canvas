import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, Plus, Search } from "lucide-react";
import { ServicesGrid } from "@/components/services/ServicesGrid";
import { ServicesList } from "@/components/services/ServicesList";
import { ServiceDialog } from "@/components/services/ServiceDialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CategoriesList from "@/components/categories/CategoriesList";
import { CategoryDialog } from "@/components/categories/CategoryDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
                <div className="relative w-full sm:max-w-[300px]">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex gap-2 items-center justify-between sm:justify-end">
                <div className="flex items-center border rounded-lg overflow-hidden">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={`rounded-none ${viewMode === 'grid' ? 'bg-secondary' : ''}`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={`rounded-none ${viewMode === 'list' ? 'bg-secondary' : ''}`}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
                <Button onClick={handleCreateService}>
                  <Plus className="h-4 w-4 mr-2" />
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
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative w-full sm:max-w-[300px]">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search categories..."
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex gap-2 items-center justify-between sm:justify-end">
                <div className="flex items-center border rounded-lg overflow-hidden">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={`rounded-none ${viewMode === 'grid' ? 'bg-secondary' : ''}`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={`rounded-none ${viewMode === 'list' ? 'bg-secondary' : ''}`}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
                <Button onClick={handleCreateCategory}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </div>
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