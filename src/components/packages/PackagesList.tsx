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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface PackagesListProps {
  searchQuery: string;
  onEdit: (service: any) => void;
}

export function PackagesList({ searchQuery, onEdit }: PackagesListProps) {
  const queryClient = useQueryClient();

  const { data: packages, isLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          package_services (
            service:services (
              id,
              name
            )
          )
        `)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async (id: string) => {
    try {
      // First delete package_services entries
      const { error: servicesError } = await supabase
        .from('package_services')
        .delete()
        .eq('package_id', id);
      
      if (servicesError) throw servicesError;

      // Then delete the package
      const { error: packageError } = await supabase
        .from('packages')
        .delete()
        .eq('id', id);
      
      if (packageError) throw packageError;
      
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      toast.success('Package deleted successfully');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredPackages = packages?.filter(pkg =>
    pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pkg.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Services</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPackages?.map((pkg) => (
            <TableRow key={pkg.id}>
              <TableCell>{pkg.name}</TableCell>
              <TableCell>{pkg.description}</TableCell>
              <TableCell>₹{pkg.price}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {pkg.package_services.map(({ service }: any) => (
                    <Badge key={service.id} variant="secondary">
                      {service.name}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(pkg)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(pkg.id)}
                  >
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