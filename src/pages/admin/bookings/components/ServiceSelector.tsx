
import React, { useState } from "react";
import { Package as PackageIcon, Plus, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CategoryFilter } from "@/components/customer/services/CategoryFilter";
import { cn } from "@/lib/utils";

type Stylist = {
  id: string;
  name: string;
  employment_type: 'stylist';
  status: 'active' | 'inactive';
};

interface ServiceSelectorProps {
  onServiceSelect: (serviceId: string) => void;
  onPackageSelect: (packageId: string, services: string[]) => void;
  onStylistSelect: (itemId: string, stylistId: string) => void;
  selectedServices: string[];
  selectedPackages: string[];
  selectedStylists: Record<string, string>;
  stylists: Stylist[];
}

export function ServiceSelector({
  onServiceSelect,
  onPackageSelect,
  onStylistSelect,
  selectedServices = [],
  selectedPackages = [],
  selectedStylists = {},
  stylists = []
}: ServiceSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedPackages, setExpandedPackages] = useState<string[]>([]);

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

  // Query for services
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*, services_categories!inner(categories(id, name))')
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    },
  });

  // Query for packages with their services
  const { data: packages } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          package_services(
            service:services(*)
          )
        `)
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    },
  });

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

  const handlePackageSelect = (pkg: any) => {
    const packageServices = pkg.package_services.map((ps: any) => ps.service.id);
    if (selectedPackages.includes(pkg.id)) {
      // If deselecting, just remove the package
      onPackageSelect(pkg.id, []);
    } else {
      // If selecting, expand the package and add it
      setExpandedPackages(prev => [...prev, pkg.id]);
      onPackageSelect(pkg.id, packageServices);
    }
  };

  return (
    <div className="space-y-6">
      <CategoryFilter
        categories={categories || []}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />

      <ScrollArea className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="w-[200px]">Stylist</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allItems.map((item) => {
              const isService = item.type === 'service';
              const isPackage = item.type === 'package';
              const isSelected = isService 
                ? selectedServices.includes(item.id)
                : selectedPackages.includes(item.id);
              const isExpanded = isPackage && (isSelected || expandedPackages.includes(item.id));

              return (
                <React.Fragment key={`${item.type}-${item.id}`}>
                  <TableRow 
                    className={cn(
                      "transition-colors",
                      isSelected && "bg-red-50 hover:bg-red-100"
                    )}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isPackage && (
                          <div className="flex items-center gap-1">
                            <PackageIcon className="h-4 w-4" />
                            <Badge variant="default">Package</Badge>
                          </div>
                        )}
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isService ? item.duration : 
                        item.package_services?.reduce((sum: number, ps: any) => 
                          sum + (ps.service?.duration || 0), 0)
                      } min
                    </TableCell>
                    <TableCell>
                      ${isService ? item.selling_price : item.price}
                    </TableCell>
                    <TableCell>
                      {isSelected && (
                        <Select 
                          value={selectedStylists[item.id] || ''} 
                          onValueChange={(value) => onStylistSelect(item.id, value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select stylist" />
                          </SelectTrigger>
                          <SelectContent>
                            {stylists.map((stylist) => (
                              <SelectItem key={stylist.id} value={stylist.id}>
                                {stylist.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (isPackage) {
                            handlePackageSelect(item);
                          } else {
                            onServiceSelect(item.id);
                          }
                        }}
                      >
                        {isSelected ? (
                          <Minus className="h-4 w-4 text-destructive" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isPackage && isExpanded && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-slate-50">
                        <div className="pl-8 pr-4 py-2 space-y-2">
                          {item.package_services?.map((ps: any) => (
                            <div
                              key={ps.service.id}
                              className="flex items-center justify-between py-2 border-b last:border-0"
                            >
                              <div className="flex items-center gap-4">
                                <span className="text-sm font-medium">{ps.service.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  ({ps.service.duration} min)
                                </span>
                              </div>
                              <span className="text-sm font-medium">
                                ${ps.service.selling_price}
                              </span>
                            </div>
                          ))}
                          {item.is_customizable && (
                            <div className="pt-2">
                              <p className="text-sm text-muted-foreground">
                                This package can be customized with additional services
                              </p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
