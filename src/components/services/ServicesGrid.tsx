import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredServices?.map((service) => (
        <Card key={service.id} className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">{service.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground">Categories</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {service.categories.map((category: any) => (
                    <Badge key={category.id} variant="secondary">
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
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" size="icon" onClick={() => onEdit(service)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => handleDelete(service.id)}>
              <Trash className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}