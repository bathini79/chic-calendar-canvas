
import React, { useState } from "react";
import { Package, Plus, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ServiceSelectorProps {
  onServiceSelect?: (serviceId: string) => void;
  onPackageSelect?: (packageId: string, services: string[]) => void;
  selectedServices?: string[];
  selectedPackages?: string[];
}

export function ServiceSelector({ 
  onServiceSelect, 
  onPackageSelect,
  selectedServices = [],
  selectedPackages = []
}: ServiceSelectorProps) {
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [customizableServices, setCustomizableServices] = useState<string[]>([]);

  // Query for services with categories
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

  // Query for packages with categories
  const { data: packages } = useQuery({
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

  const handlePackageSelect = (pkg: any) => {
    if (pkg.is_customizable) {
      setSelectedPackage(pkg);
      setCustomizableServices([]);
      setShowCustomizeDialog(true);
    } else {
      const services = pkg.package_services.map((ps: any) => ps.service.id);
      onPackageSelect?.(pkg.id, services);
    }
  };

  const handlePackageConfirm = () => {
    if (selectedPackage) {
      const baseServices = selectedPackage.package_services.map((ps: any) => ps.service.id);
      onPackageSelect?.(selectedPackage.id, [...baseServices, ...customizableServices]);
      setShowCustomizeDialog(false);
      setSelectedPackage(null);
      setCustomizableServices([]);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="services" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="services" className="flex-1">Services</TabsTrigger>
          <TabsTrigger value="packages" className="flex-1">Packages</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <ScrollArea className="h-[600px] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Name</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services?.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {service.services_categories.map((sc: any) => (
                          <Badge key={sc.categories.id} variant="secondary">
                            {sc.categories.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{service.duration} min</TableCell>
                    <TableCell>₹{service.selling_price}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onServiceSelect?.(service.id)}
                      >
                        {selectedServices.includes(service.id) ? (
                          <Minus className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="packages">
          <ScrollArea className="h-[600px] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package Name</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Included Services</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages?.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span className="font-medium">{pkg.name}</span>
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
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {pkg.package_services.map((ps: any) => (
                          <Badge key={ps.service.id} variant="outline">
                            {ps.service.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{pkg.duration} min</TableCell>
                    <TableCell>₹{pkg.price}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePackageSelect(pkg)}
                      >
                        {selectedPackages.includes(pkg.id) ? (
                          <Minus className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <Dialog open={showCustomizeDialog} onOpenChange={setShowCustomizeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customize Package: {selectedPackage?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Included Services</h4>
              <div className="flex flex-wrap gap-2">
                {selectedPackage?.package_services.map((ps: any) => (
                  <Badge key={ps.service.id}>
                    {ps.service.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Additional Services</h4>
              <ScrollArea className="h-[300px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service Name</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services
                      ?.filter(service => 
                        !selectedPackage?.package_services.some((ps: any) => ps.service.id === service.id)
                      )
                      .map((service) => (
                        <TableRow key={service.id}>
                          <TableCell className="font-medium">{service.name}</TableCell>
                          <TableCell>{service.duration} min</TableCell>
                          <TableCell>₹{service.selling_price}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (customizableServices.includes(service.id)) {
                                  setCustomizableServices(prev => 
                                    prev.filter(id => id !== service.id)
                                  );
                                } else {
                                  setCustomizableServices(prev => [...prev, service.id]);
                                }
                              }}
                            >
                              {customizableServices.includes(service.id) ? (
                                <Minus className="h-4 w-4" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCustomizeDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handlePackageConfirm}>
                Confirm Package
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
