
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, PenSquare } from "lucide-react";

interface PackagesListProps {
  searchQuery: string;
  onEdit: (pkg: any) => void;
}

export function PackagesList({ searchQuery, onEdit }: PackagesListProps) {
  const { data: packages, isLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          package_categories (
            categories (
              id,
              name
            )
          ),
          package_services (
            service:services (
              id,
              name,
              selling_price
            ),
            package_selling_price
          )
        `)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const filteredPackages = packages?.filter(pkg =>
    pkg.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Categories</TableHead>
            <TableHead>Services</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPackages?.map((pkg) => (
            <TableRow key={pkg.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span className="font-medium">{pkg.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {pkg?.package_categories.map((pc: any) => (
                    <Badge key={pc.categories.id} variant="secondary">
                      {pc.categories.name}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {pkg.package_services.map((ps: any) => (
                    <Badge key={ps.service.id} variant="outline">
                      {ps.service.name}
                      {ps.package_selling_price !== null && 
                       ps.package_selling_price !== undefined && 
                       ps.package_selling_price !== ps.service.selling_price ? 
                        ` (₹${ps.package_selling_price})` : ''}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>{pkg.duration} min</TableCell>
              <TableCell>₹{pkg.price}</TableCell>
              <TableCell>{pkg.status}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(pkg)}
                >
                  <PenSquare className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
