import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ServicesListProps {
  searchQuery: string;
  onEdit: (service: any) => void;
}

export function ServicesList({ searchQuery, onEdit }: ServicesListProps) {
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
    <div className="w-full border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service Name</TableHead>
            <TableHead>Categories</TableHead>
            <TableHead>Original Price</TableHead>
            <TableHead>Selling Price</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredServices?.map((service) => (
            <TableRow key={service.id}>
              <TableCell>{service.name}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {service.categories.map((category: any) => (
                    <Badge key={category.id} variant="secondary">
                      {category.name}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>₹{service.original_price}</TableCell>
              <TableCell>₹{service.selling_price}</TableCell>
              <TableCell>{service.duration} min</TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="outline" size="icon" onClick={() => onEdit(service)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleDelete(service.id)}>
                  <Trash className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}