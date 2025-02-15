
import React from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, PenSquare } from "lucide-react";

interface PackagesGridProps {
  searchQuery: string;
  onEdit: (pkg: any) => void;
}

export function PackagesGrid({ searchQuery, onEdit }: PackagesGridProps) {
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
              name
            )
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredPackages?.map((pkg) => (
        <Card key={pkg.id} className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <h3 className="font-semibold">{pkg.name}</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(pkg)}
              >
                <PenSquare className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            {pkg.description && (
              <p className="text-sm text-muted-foreground">{pkg.description}</p>
            )}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {pkg.package_categories.map((pc: any) => (
                  <Badge key={pc.categories.id} variant="secondary">
                    {pc.categories.name}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {pkg.package_services.map((ps: any) => (
                  <Badge key={ps.service.id} variant="outline">
                    {ps.service.name}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>{pkg.duration} min</span>
              <span className="font-medium">₹{pkg.price}</span>
            </div>
          </CardContent>
          <CardFooter>
            <div className="flex items-center text-sm text-muted-foreground">
              <span className="font-medium">
                Status: {pkg.status}
              </span>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
