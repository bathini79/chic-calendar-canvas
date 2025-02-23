
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
import { Package, PenSquare, ChevronDown, ChevronUp, User } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface PackagesListProps {
  searchQuery: string;
  onEdit: (pkg: any) => void;
}

export function PackagesList({ searchQuery, onEdit }: PackagesListProps) {
  const [openPackages, setOpenPackages] = React.useState<string[]>([]);

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
              duration,
              selling_price
            )
          )
        `)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const togglePackage = (packageId: string) => {
    setOpenPackages(current =>
      current.includes(packageId)
        ? current.filter(id => id !== packageId)
        : [...current, packageId]
    );
  };

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
            <TableHead>Duration</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPackages?.map((pkg) => {
            const isOpen = openPackages.includes(pkg.id);
            const totalDuration = pkg.package_services.reduce(
              (sum: number, ps: any) => sum + (ps.service?.duration || 0),
              0
            );

            return (
              <React.Fragment key={pkg.id}>
                <TableRow className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-auto font-medium"
                        onClick={() => togglePackage(pkg.id)}
                      >
                        {pkg.name}
                        {isOpen ? (
                          <ChevronUp className="ml-2 h-4 w-4" />
                        ) : (
                          <ChevronDown className="ml-2 h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {pkg.package_categories.map((pc: any) => (
                        <Badge key={pc.categories.id} variant="secondary">
                          {pc.categories.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{totalDuration} min</TableCell>
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
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <Collapsible open={isOpen}>
                      <CollapsibleContent className="px-4 py-2 bg-muted/30">
                        <div className="space-y-2">
                          {pkg.package_services.map((ps: any) => (
                            <div
                              key={ps.service.id}
                              className="flex items-center justify-between py-2 px-4 bg-background rounded-lg"
                            >
                              <div className="flex items-center gap-4">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{ps.service.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {ps.service.duration} min • ₹{ps.service.selling_price}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
