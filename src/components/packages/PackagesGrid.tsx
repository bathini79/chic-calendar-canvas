
import React from "react";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, PenSquare, ChevronDown, ChevronUp, User } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface PackagesGridProps {
  searchQuery: string;
  onEdit: (pkg: any) => void;
}

export function PackagesGrid({ searchQuery, onEdit }: PackagesGridProps) {
  const [openPackages, setOpenPackages] = React.useState<string[]>([]);

  const { data: packages, isLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data: packagesData, error: packagesError } = await supabase
        .from('packages')
        .select(`
          *,
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
      
      if (packagesError) {
        console.error('Error fetching packages:', packagesError);
        throw packagesError;
      }

      // Then fetch all categories to map them to packages
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name');

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
        throw categoriesError;
      }

      // Map categories to packages
      return packagesData.map(pkg => ({
        ...pkg,
        package_categories: (pkg.categories || []).map(categoryId => ({
          categories: categories.find(cat => cat.id === categoryId)
        }))
      }));
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredPackages?.map((pkg) => {
        const isOpen = openPackages.includes(pkg.id);
        const totalDuration = pkg.package_services.reduce(
          (sum: number, ps: any) => sum + (ps.service?.duration || 0),
          0
        );

        return (
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
                  {pkg.package_categories?.map((pc: any) => (
                    <Badge key={pc.categories?.id} variant="secondary">
                      {pc.categories?.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>{totalDuration} min</span>
                <span className="font-medium">₹{pkg.price}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => togglePackage(pkg.id)}
              >
                {isOpen ? (
                  <>
                    Hide Services
                    <ChevronUp className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Show Services
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <Collapsible open={isOpen}>
                <CollapsibleContent className="space-y-2">
                  {pkg.package_services.map((ps: any) => (
                    <div
                      key={ps.service.id}
                      className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-2">
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
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
            <CardFooter>
              <div className="flex items-center text-sm text-muted-foreground">
                <span className="font-medium">
                  Status: {pkg.status}
                </span>
              </div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
