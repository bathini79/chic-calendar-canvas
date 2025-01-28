import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Image as ImageIcon, Trash } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ServicesGridProps {
  searchQuery: string;
  onEdit: (service: any) => void;
}

export function ServicesGrid({ searchQuery, onEdit }: ServicesGridProps) {
  const queryClient = useQueryClient();

  const { data: services, isLoading, error } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          services_categories (
            categories (
              id,
              name
            )
          )
        `);
      
      if (error) {
        toast.error("Error loading services");
        throw error;
      }

      return data || [];
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
    service.services_categories?.some((sc: any) => 
      sc.categories?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error loading services. Please try again.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!filteredServices?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No services found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
      {filteredServices?.map((service) => (
        <Card key={service.id} className="relative group">
          {service.image_urls && service.image_urls[0] ? (
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
          <CardHeader>
            <CardTitle className="flex justify-between items-start">
              <span>{service.name}</span>
              <div className="flex gap-2">
                {service.services_categories?.map((sc: any) => (
                  <Badge key={sc.categories.id} variant="secondary">
                    {sc.categories.name}
                  </Badge>
                ))}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
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
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => onEdit(service)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(service.id)}>
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
