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
import { useState } from "react";
import { DataPagination, STANDARD_PAGE_SIZES } from "@/components/common/DataPagination";

interface ServicesListProps {
  searchQuery: string;
  onEdit: (service: any) => void;
}

export function ServicesList({ searchQuery, onEdit }: ServicesListProps) {
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
      
      let query = supabase
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
        .eq('status', 'active')
        .order('name')
        .range(from, to);
      
      // Apply server-side filter if search query exists
      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }
      
      const { data: servicesData, error } = await query;
      
      if (error) {
        console.error("Error loading services:", error);
        toast.error("Error loading services");
        throw error;
      }
      const transformedServices = servicesData?.map(service => ({
        ...service,
        categories: service.services_categories?.map((sc: any) => sc.categories) || []
      }));

      return transformedServices || [];
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
            <TableHead>Gender</TableHead>
            <TableHead>Original Price</TableHead>
            <TableHead>Selling Price</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead className="w-[100px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services?.map((service) => (
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
              <TableCell>
                <span className="capitalize">
                  {service.gender === 'male' ? 'Male' : 
                   service.gender === 'female' ? 'Female' : 
                   service.gender || 'All'}
                </span>
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
      
      {/* Add pagination component */}
      <div className="px-4 py-4 border-t border-gray-200">
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