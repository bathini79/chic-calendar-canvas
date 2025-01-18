import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash } from "lucide-react";
import { toast } from "sonner";

interface PackagesGridProps {
  searchQuery: string;
  onEdit: (service: any) => void;
}

export function PackagesGrid({ searchQuery, onEdit }: PackagesGridProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredPackages?.map((pkg) => (
        <Card key={pkg.id} className="relative group">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{pkg.name}</CardTitle>
                <CardDescription>₹{pkg.price}</CardDescription>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pkg.description && (
                <p className="text-sm text-muted-foreground">{pkg.description}</p>
              )}
              <div className="flex flex-wrap gap-1">
                {pkg.package_services.map(({ service }: any) => (
                  <Badge key={service.id} variant="secondary">
                    {service.name}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}