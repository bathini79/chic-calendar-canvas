
import React, { useState, useEffect } from "react";
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
import { Service, Package as PackageType } from "../types";
import { cn } from "@/lib/utils";

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
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null);
  const [customizableServices, setCustomizableServices] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);

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
      return data as PackageType[];
    },
  });

  // Calculate total amount whenever selections change
  useEffect(() => {
    let total = 0;
    
    // Add service prices
    selectedServices.forEach(serviceId => {
      const service = services?.find(s => s.id === serviceId);
      if (service) {
        total += service.selling_price;
      }
    });

    // Add package prices
    selectedPackages.forEach(packageId => {
      const pkg = packages?.find(p => p.id === packageId);
      if (pkg) {
        total += pkg.price;
      }
    });

    setTotalAmount(total);
  }, [selectedServices, selectedPackages, services, packages]);

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
      <CategoryFilter
        categories={categories || []}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />

      {/* Services and Packages List */}
      <ScrollArea className="h-[400px] border rounded-md">
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
              <TableRow 
                key={`${item.type}-${item.id}`}
                className={cn(
                  (item.type === 'package' ? selectedPackages : selectedServices).includes(item.id) &&
                  "bg-red-50"
                )}
              >
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
                <TableCell>${item.type === 'package' ? item.price : item.selling_price}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (item.type === 'package') {
                        if (item.is_customizable) {
                          setSelectedPackage(item);
                          setShowCustomizeDialog(true);
                        } else {
                          onPackageSelect?.(item.id, []);
                        }
                      } else {
                        onServiceSelect?.(item.id);
                      }
                    }}
                  >
                    {(item.type === 'package' ? selectedPackages : selectedServices).includes(item.id) ? (
                      <Minus className="h-4 w-4 text-red-500" />
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

      {/* Total Amount */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-medium">Total Amount:</span>
          <span className="text-xl font-bold">${totalAmount.toFixed(2)}</span>
        </div>
      </div>

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
                        <TableRow 
                          key={service.id}
                          className={cn(
                            customizableServices.includes(service.id) && "bg-red-50"
                          )}
                        >
                          <TableCell className="font-medium">{service.name}</TableCell>
                          <TableCell>{service.duration} min</TableCell>
                          <TableCell>${service.selling_price}</TableCell>
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
                                <Minus className="h-4 w-4 text-red-500" />
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
              <Button onClick={() => {
                if (selectedPackage) {
                  onPackageSelect?.(selectedPackage.id, customizableServices);
                  setShowCustomizeDialog(false);
                  setSelectedPackage(null);
                  setCustomizableServices([]);
                }
              }}>
                Confirm Package
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
