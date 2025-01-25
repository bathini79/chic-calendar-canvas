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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

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
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

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

  const handleCustomizeOpen = (pkg: any) => {
    setSelectedPackage(pkg);
    // Initialize with included services
    const includedServiceIds = pkg.package_services.map((ps: any) => ps.service.id);
    setSelectedServices(includedServiceIds);
    setCustomizeDialogOpen(true);
    calculateTotals(includedServiceIds, pkg);
  };

  const handleServiceToggle = (serviceId: string, checked: boolean) => {
    let newSelectedServices;
    if (checked) {
      newSelectedServices = [...selectedServices, serviceId];
    } else {
      // Don't allow removing included services
      const includedServiceIds = selectedPackage.package_services.map((ps: any) => ps.service.id);
      if (includedServiceIds.includes(serviceId)) return;
      newSelectedServices = selectedServices.filter(id => id !== serviceId);
    }
    setSelectedServices(newSelectedServices);
    calculateTotals(newSelectedServices, selectedPackage);
  };

  const calculateTotals = (serviceIds: string[], pkg: any) => {
    const includedServiceIds = pkg.package_services.map((ps: any) => ps.service.id);
    let price = pkg.price; // Start with base package price
    let duration = pkg.duration;

    // Add prices and durations for additional selected services
    serviceIds.forEach(serviceId => {
      if (!includedServiceIds.includes(serviceId)) {
        const service = allServices?.find(s => s.id === serviceId);
        if (service) {
          price += service.selling_price;
          duration += service.duration;
        }
      }
    });

    setTotalPrice(price);
    setTotalDuration(duration);
  };

  const isServiceIncluded = (serviceId: string) => {
    return selectedPackage?.package_services.some((ps: any) => ps.service.id === serviceId);
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
                    onClick={() => handleCustomizeOpen(pkg)}
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
              <div className="space-y-4">
                <h3 className="font-semibold">Included Services</h3>
                {selectedPackage?.package_services.map(({ service }: any) => (
                  <div
                    key={service.id}
                    className="flex items-center space-x-2 p-2 rounded-lg bg-muted"
                  >
                    <Checkbox
                      checked={true}
                      disabled
                    />
                    <div className="flex-1">
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {service.duration} min • ₹{service.selling_price}
                      </p>
                    </div>
                    <Badge>Included</Badge>
                  </div>
                ))}
              </div>

              {selectedPackage?.is_customizable && (
                <div className="space-y-4">
                  <Separator />
                  <h3 className="font-semibold">Optional Services</h3>
                  {allServices
                    ?.filter(service => 
                      !isServiceIncluded(service.id) &&
                      selectedPackage.customizable_services?.includes(service.id)
                    )
                    .map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center space-x-2 p-2 rounded-lg bg-muted"
                      >
                        <Checkbox
                          checked={selectedServices.includes(service.id)}
                          onCheckedChange={(checked) => 
                            handleServiceToggle(service.id, checked as boolean)
                          }
                        />
                        <div className="flex-1">
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {service.duration} min • ₹{service.selling_price}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="space-y-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Total Duration: {totalDuration} min</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Total Price: ₹{totalPrice}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCustomizeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  navigate(`/book/package/${selectedPackage?.id}?customize=true&services=${selectedServices.join(',')}`);
                  setCustomizeDialogOpen(false);
                }}>
                  Continue Booking
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}