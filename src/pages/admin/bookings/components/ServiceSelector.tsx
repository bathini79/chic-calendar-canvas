
import React, { useState } from "react";
import { Package, Plus, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { CategoryFilter } from "@/components/customer/services/CategoryFilter";
import { Service, Package } from "../types";

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
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [customizableServices, setCustomizableServices] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Query for categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

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
      return data as Service[];
    },
  });

  // Query for packages with services
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
      return data as Package[];
    },
  });

  const handlePackageSelect = (pkg: Package) => {
    if (pkg.is_customizable) {
      setSelectedPackage(pkg);
      setCustomizableServices([]);
      setShowCustomizeDialog(true);
    } else {
      const services = pkg.package_services.map(ps => ps.service.id);
      onPackageSelect?.(pkg.id, services);
    }
  };

  const handlePackageConfirm = () => {
    if (selectedPackage) {
      const baseServices = selectedPackage.package_services.map(ps => ps.service.id);
      onPackageSelect?.(selectedPackage.id, [...baseServices, ...customizableServices]);
      setShowCustomizeDialog(false);
      setSelectedPackage(null);
      setCustomizableServices([]);
    }
  };

  // Filter items based on selected category
  const filteredServices = selectedCategory
    ? services?.filter(service => 
        service.services_categories.some(sc => sc.categories.id === selectedCategory)
      )
    : services;

  const filteredPackages = selectedCategory
    ? packages?.filter(pkg => 
        pkg.package_services.some(ps => 
          services?.find(s => s.id === ps.service.id)?.services_categories.some(
            sc => sc.categories.id === selectedCategory
          )
        )
      )
    : packages;

  // Combine and sort items to show packages first
  const allItems = [
    ...(filteredPackages || []).map(pkg => ({
      type: 'package' as const,
      ...pkg
    })),
    ...(filteredServices || []).map(service => ({
      type: 'service' as const,
      ...service
    }))
  ];

  return (
    <div className="space-y-6">
      {/* Categories Filter */}
      <CategoryFilter
        categories={categories || []}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />

      {/* Services and Packages List */}
      <ScrollArea className="h-[600px] border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allItems.map((item) => (
              <TableRow key={`${item.type}-${item.id}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {item.type === 'package' && <Package className="h-4 w-4" />}
                    <span className="font-medium">{item.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={item.type === 'package' ? 'default' : 'outline'}>
                    {item.type === 'package' 
                      ? (item.is_customizable ? 'Customizable Package' : 'Package')
                      : 'Service'
                    }
                  </Badge>
                </TableCell>
                <TableCell>{item.duration} min</TableCell>
                <TableCell>
                  ₹{item.type === 'package' ? item.price : item.selling_price}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (item.type === 'package') {
                        handlePackageSelect(item);
                      } else {
                        onServiceSelect?.(item.id);
                      }
                    }}
                  >
                    {(item.type === 'package' ? selectedPackages : selectedServices).includes(item.id) ? (
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

      {/* Customize Package Dialog */}
      <Dialog open={showCustomizeDialog} onOpenChange={setShowCustomizeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customize Package: {selectedPackage?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Included Services</h4>
              <div className="flex flex-wrap gap-2">
                {selectedPackage?.package_services.map((ps) => (
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
                        !selectedPackage?.package_services.some(ps => ps.service.id === service.id)
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
