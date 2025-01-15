import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ServicesGridProps {
  searchQuery: string;
  onEdit: (service: any) => void;
}

export function ServicesGrid({ searchQuery, onEdit }: ServicesGridProps) {
  const queryClient = useQueryClient();

  const { data: services, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*');
      
      if (servicesError) throw servicesError;

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

      return servicesData.map(service => ({
        ...service,
        categories: categoriesData
          .filter(sc => sc.service_id === service.id)
          .map(sc => sc.categories),
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

  const filteredServices = services?.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.categories.some((cat: any) => 
      cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
      {filteredServices?.map((service) => (
        <Card key={service.id} className="relative group">
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
                {service.categories.map((category: any) => (
                  <Badge key={category.id} variant="secondary" className="text-xs">
                    {category.name}
                  </Badge>
                ))}
              </div>
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
    </div>
  );
}