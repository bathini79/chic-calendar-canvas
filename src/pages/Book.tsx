import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Scissors } from "lucide-react";
import { SearchInput } from "@/components/services/components/SearchInput";
import { useState } from "react";
import { ServicesContent } from "@/components/services/components/ServicesContent";
import { PackagesGrid } from "@/components/packages/PackagesGrid";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Book = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const handleServiceSelect = (serviceId: string) => {
    navigate(`/book/service/${serviceId}`);
  };

  const handlePackageSelect = (packageId: string) => {
    navigate(`/book/package/${packageId}`);
  };

  return (
    <div className="w-full min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Book an Appointment</h1>
        </div>

        <Tabs defaultValue="services" className="w-full">
          <div className="flex flex-col space-y-6">
            <div className="flex items-center border-b">
              <TabsList className="bg-transparent h-auto p-0">
                <TabsTrigger 
                  value="services" 
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 pb-3 flex items-center gap-2"
                >
                  <Scissors className="h-4 w-4" />
                  Services
                </TabsTrigger>
                <TabsTrigger 
                  value="packages" 
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-6 pb-3 flex items-center gap-2"
                >
                  <Package className="h-4 w-4" />
                  Packages
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search..."
                />
              </div>
            </div>

            <TabsContent value="services" className="space-y-6">
              <ServicesContent
                view="grid"
                searchQuery={searchQuery}
                onSelect={handleServiceSelect}
                showBookButton
              />
            </TabsContent>

            <TabsContent value="packages" className="space-y-6">
              <PackagesGrid
                searchQuery={searchQuery}
                onSelect={handlePackageSelect}
                showBookButton
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Book;