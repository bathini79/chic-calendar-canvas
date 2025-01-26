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
      const { data: servicesData, error } = await supabase
        .from('services')
        .select(`
          *,
          services_categories!inner (
            categories (
              id,
              name
            )
          )
        `)
        .eq('status', 'active');
      
      if (error) {
        console.error("Error loading services:", error);
        toast.error("Error loading services");
        throw error;
      }

      return servicesData?.map(service => ({
        ...service,
        categories: service.services_categories?.map((sc: any) => sc.categories) || []
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
      console.error("Error deleting service:", error);
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

  if (!services || services.length === 0) {
    return <div>No services found</div>;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Service Name</TableHead>
            <TableHead className="w-[250px]">Categories</TableHead>
            <TableHead>Original Price</TableHead>
            <TableHead>Selling Price</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead className="w-[100px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredServices?.map((service) => (
            <TableRow key={service.id}>
              <TableCell className="font-medium">{service.name}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {service.categories.map((category: any) => (
                    <Badge key={category.id} variant="secondary" className="text-xs">
                      {category.name}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>₹{service.original_price}</TableCell>
              <TableCell>₹{service.selling_price}</TableCell>
              <TableCell>{service.duration} min</TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(service)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(service.id)}>
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}