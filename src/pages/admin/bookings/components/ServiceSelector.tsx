
import React, { useState, useEffect } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CategoryFilter } from "@/components/customer/services/CategoryFilter";
import type { Service } from "../types";
import { cn } from "@/lib/utils";

interface ServicePackage {
  id: string;
  name: string;
  price: number;
  duration: number;
  package_services: {
    service: Service;
  }[];
}

interface ServiceSelectorProps {
  onServiceSelect: (serviceId: string) => void;
  onPackageSelect: (packageId: string, services: string[]) => void;
  selectedServices: string[];
  selectedPackages: string[];
}

export function ServiceSelector({ 
  onServiceSelect, 
  onPackageSelect,
  selectedServices = [],
  selectedPackages = []
}: ServiceSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

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

  // Query for packages
  const { data: packages } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*, package_services(service:services(*))')
        .eq('status', 'active');
      
      if (error) throw error;
      return data as ServicePackage[];
    },
  });

  // Calculate total whenever selections change
  useEffect(() => {
    let newTotal = 0;
    
    // Add service prices
    selectedServices.forEach(serviceId => {
      const service = services?.find(s => s.id === serviceId);
      if (service) {
        newTotal += service.selling_price;
      }
    });

    // Add package prices
    selectedPackages.forEach(packageId => {
      const pkg = packages?.find(p => p.id === packageId);
      if (pkg) {
        newTotal += pkg.price;
      }
    });

    setTotal(newTotal);
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
            {allItems.map((item) => {
              const isSelected = item.type === 'package' 
                ? selectedPackages.includes(item.id)
                : selectedServices.includes(item.id);

              return (
                <TableRow 
                  key={`${item.type}-${item.id}`}
                  className={cn(isSelected && "bg-red-50")}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {item.type === 'package' && <PackageIcon className="h-4 w-4" />}
                      <span className="font-medium">{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.type === 'package' ? 'default' : 'outline'}>
                      {item.type === 'package' ? 'Package' : 'Service'}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.duration} min</TableCell>
                  <TableCell>
                    ${item.type === 'package' ? item.price : item.selling_price}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (item.type === 'package') {
                          onPackageSelect(item.id, []);
                        } else {
                          onServiceSelect(item.id);
                        }
                      }}
                    >
                      {isSelected ? (
                        <Minus className="h-4 w-4 text-red-500" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Total Amount */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-medium">Total Amount:</span>
          <span className="text-xl font-bold">${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
