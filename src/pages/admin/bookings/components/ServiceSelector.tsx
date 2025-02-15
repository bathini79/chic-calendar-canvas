
import React from "react";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ServiceSelectorProps {
  onServiceSelect?: (serviceId: string) => void;
  onPackageSelect?: (packageId: string, services: string[]) => void;
}

export function ServiceSelector({ onServiceSelect, onPackageSelect }: ServiceSelectorProps) {
  // Query for services
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
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
      
      if (error) throw error;
      return data;
    },
  });

  // Query for packages
  const { data: packages } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          package_services (
            service:services (
              id,
              name,
              selling_price,
              duration
            )
          )
        `)
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <Tabs defaultValue="services" className="w-full">
      <TabsList>
        <TabsTrigger value="services">Services</TabsTrigger>
        <TabsTrigger value="packages">Packages</TabsTrigger>
      </TabsList>

      <TabsContent value="services" className="space-y-4">
        <ScrollArea className="h-[600px]">
          <div className="grid grid-cols-2 gap-4">
            {services?.map((service) => (
              <Card 
                key={service.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onServiceSelect?.(service.id)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  <div className="flex flex-wrap gap-1">
                    {service.services_categories.map((sc: any) => (
                      <Badge key={sc.categories.id} variant="secondary">
                        {sc.categories.name}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {service.description || "No description available"}
                  </p>
                  <div className="flex justify-between items-center">
                    <span>₹{service.selling_price}</span>
                    <span className="text-sm text-muted-foreground">
                      {service.duration} min
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="packages" className="space-y-4">
        <ScrollArea className="h-[600px]">
          <div className="grid grid-cols-2 gap-4">
            {packages?.map((pkg) => (
              <Card 
                key={pkg.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  const services = pkg.package_services.map((ps: any) => ps.service.id);
                  onPackageSelect?.(pkg.id, services);
                }}
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <CardTitle className="text-lg">{pkg.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {pkg.description || "No description available"}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {pkg.package_services.map((ps: any) => (
                      <Badge key={ps.service.id} variant="outline">
                        {ps.service.name}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <span>₹{pkg.price}</span>
                    <span className="text-sm text-muted-foreground">
                      {pkg.duration} min
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
