import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, DollarSign } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

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
              name
            )
          )
        `)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

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
            <DialogTitle>Customize Package</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Included Services</h3>
              <div className="flex flex-wrap gap-2">
                {selectedPackage?.package_services.map(({ service }: any) => (
                  <Badge key={service.id}>{service.name}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Optional Services</h3>
              <div className="flex flex-wrap gap-2">
                {selectedPackage?.customizable_services?.map((serviceId: string) => (
                  <Badge key={serviceId} variant="outline">Add Service</Badge>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}