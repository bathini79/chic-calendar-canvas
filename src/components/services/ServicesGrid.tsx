import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Image as ImageIcon, Trash } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { DataPagination, STANDARD_PAGE_SIZES } from "@/components/common/DataPagination";

interface ServicesGridProps {
  searchQuery: string;
  onEdit: (service: any) => void;
}

export function ServicesGrid({ searchQuery, onEdit }: ServicesGridProps) {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(STANDARD_PAGE_SIZES[0]); // Use first standard size (10)
  const [totalCount, setTotalCount] = useState(0);

  const { data: services, isLoading } = useQuery({
    queryKey: ['services', currentPage, pageSize, searchQuery],
    queryFn: async () => {
      // First get the total count for pagination
      let countQuery = supabase
        .from("services")
        .select("id", { count: "exact" })
        .eq('status', 'active');
      
      if (searchQuery) {
        countQuery = countQuery.ilike("name", `%${searchQuery}%`);
      }
      
      const { count, error: countError } = await countQuery;
      
      if (countError) {
        console.error("Error fetching count:", countError);
        throw countError;
      }
      
      setTotalCount(count || 0);
      
      // Then get the paginated data
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      
      // First fetch services with pagination
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('status', 'active')
        .order('name')
        .range(from, to);
      
      if (servicesError) throw servicesError;

      // Then fetch categories for these services
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('services_categories')
        .select(`
          service_id,
          categories (
            id,
            name
          )
        `);
      
      if (categoriesError) throw categoriesError;

      // Map categories to services
      return servicesData.map(service => ({
        ...service,
        categories: categoriesData
          .filter(sc => sc.service_id === service.id)
          .map(sc => sc.categories) || [],
      }));
    },
  });

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service deleted successfully');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Filter services by search query if needed (client-side filtering)
  const filteredServices = searchQuery.length > 0 
    ? services?.filter(service =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.categories?.some((cat: any) => 
          cat?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : services;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
        {filteredServices?.map((service) => (
          <Card key={service.id} className="relative group">
            {service.image_urls && service.image_urls.length > 0 ? (
              <div className="relative aspect-video">
                <img
                  src={service.image_urls[0]}
                  alt={service.name}
                  className="w-full h-full object-cover rounded-t-lg"
                />
              </div>
            ) : (
              <div className="relative aspect-video bg-muted flex items-center justify-center rounded-t-lg">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex justify-between items-start">
                <span className="line-clamp-1">{service.name}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(service)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(service.id)}>
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground">Categories</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {service.categories?.map((category: any) => (
                    <Badge key={category.id} variant="secondary" className="text-xs">
                      {category.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Gender</span>
                <span className="capitalize">
                  {service.gender === 'male' ? 'Male' : 
                   service.gender === 'female' ? 'Female' : 
                   service.gender || 'All'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Original Price</span>
                <span>₹{service.original_price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Selling Price</span>
                <span>₹{service.selling_price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Duration</span>
                <span>{service.duration} min</span>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {(!services || services.length === 0) && (
          <div className="col-span-full p-8 text-center bg-muted/20 rounded-lg">
            <h3 className="font-medium text-lg">No services found</h3>
            <p className="text-muted-foreground mt-2">
              {searchQuery ? `No results for "${searchQuery}"` : 'Add your first service to get started'}
            </p>
          </div>
        )}
      </div>
      
      {/* Add pagination component */}
      <div className="border-t border-gray-200 pt-4">
        <DataPagination
          currentPage={currentPage}
          totalItems={totalCount}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={STANDARD_PAGE_SIZES}
        />
      </div>
    </div>
  );
}