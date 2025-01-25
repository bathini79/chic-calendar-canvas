import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, DollarSign } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ServicesByCategory {
  [category: string]: {
    id: string;
    name: string;
    price: number;
    duration: number;
  }[];
}

export function CustomerPackagesGrid() {
  const navigate = useNavigate();
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);

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
              name,
              selling_price,
              duration,
              services_categories (
                categories (
                  id,
                  name
                )
              )
            )
          )
        `)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: allServices } = useQuery({
    queryKey: ['services-by-category'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select(`
          id,
          name,
          selling_price,
          duration,
          services_categories (
            categories (
              id,
              name
            )
          )
        `)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: customizeDialogOpen,
  });

  const groupServicesByCategory = (services: any[]): ServicesByCategory => {
    const grouped: ServicesByCategory = {};
    
    services?.forEach((service) => {
      service.services_categories?.forEach((sc: any) => {
        const categoryName = sc.categories.name;
        if (!grouped[categoryName]) {
          grouped[categoryName] = [];
        }
        grouped[categoryName].push({
          id: service.id,
          name: service.name,
          price: service.selling_price,
          duration: service.duration,
        });
      });
    });
    
    return grouped;
  };

  const getIncludedServices = () => {
    if (!selectedPackage) return {};
    return groupServicesByCategory(selectedPackage.package_services.map((ps: any) => ps.service));
  };

  const getCustomizableServices = () => {
    if (!selectedPackage || !allServices) return {};
    
    // Filter out services that are already included in the package
    const includedServiceIds = selectedPackage.package_services.map((ps: any) => ps.service.id);
    const customizableServices = allServices.filter(
      service => !includedServiceIds.includes(service.id) &&
                 selectedPackage.customizable_services?.includes(service.id)
    );
    
    return groupServicesByCategory(customizableServices);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages?.map((pkg) => (
          <Card key={pkg.id} className="h-full flex flex-col">
            {pkg.image_urls && pkg.image_urls[0] ? (
              <div className="relative aspect-video">
                <img
                  src={pkg.image_urls[0]}
                  alt={pkg.name}
                  className="w-full h-full object-cover rounded-t-lg"
                />
              </div>
            ) : (
              <div className="bg-muted aspect-video rounded-t-lg flex items-center justify-center">
                <Package className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <CardHeader>
              <CardTitle>{pkg.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
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
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{pkg.duration} min</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>₹{pkg.price}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              {pkg.is_customizable ? (
                <div className="flex w-full gap-2">
                  <Button 
                    className="flex-[7]"
                    onClick={() => navigate(`/book/package/${pkg.id}`)}
                  >
                    Book Now
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-[3]"
                    onClick={() => {
                      setSelectedPackage(pkg);
                      setCustomizeDialogOpen(true);
                    }}
                  >
                    Customize
                  </Button>
                </div>
              ) : (
                <Button 
                  className="w-full"
                  onClick={() => navigate(`/book/package/${pkg.id}`)}
                >
                  Book Now
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={customizeDialogOpen} onOpenChange={setCustomizeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customize {selectedPackage?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6 p-1">
              <div>
                <h3 className="text-lg font-semibold mb-4">Included Services</h3>
                <Accordion type="single" collapsible className="w-full">
                  {Object.entries(getIncludedServices()).map(([category, services]) => (
                    <AccordionItem key={category} value={category}>
                      <AccordionTrigger className="text-base">
                        {category}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          {services.map((service) => (
                            <div
                              key={service.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-muted"
                            >
                              <div>
                                <p className="font-medium">{service.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {service.duration} min
                                </p>
                              </div>
                              <Badge>Included</Badge>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Optional Services</h3>
                <Accordion type="single" collapsible className="w-full">
                  {Object.entries(getCustomizableServices()).map(([category, services]) => (
                    <AccordionItem key={category} value={category}>
                      <AccordionTrigger className="text-base">
                        {category}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          {services.map((service) => (
                            <div
                              key={service.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-muted"
                            >
                              <div>
                                <p className="font-medium">{service.name}</p>
                                <div className="text-sm text-muted-foreground">
                                  <span>{service.duration} min</span>
                                  <span className="mx-2">•</span>
                                  <span>₹{service.price}</span>
                                </div>
                              </div>
                              <Button variant="outline" size="sm">
                                Add Service
                              </Button>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setCustomizeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              navigate(`/book/package/${selectedPackage?.id}?customize=true`);
              setCustomizeDialogOpen(false);
            }}>
              Continue Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}