import React from 'react';
import { useState, useEffect } from "react";
import { Package as PackageIcon, Plus, Minus, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useStaffAvailability } from "../hooks/useStaffAvailability";

type Stylist = {
  id: string;
  name: string;
  employment_type: 'stylist';
  status: 'active' | 'inactive';
};

export interface ServiceSelectorProps {
  onServiceSelect?: (serviceId: string) => void;
  onPackageSelect?: (packageId: string, serviceIds?: string[]) => void;
  onStylistSelect: (itemId: string, stylistId: string) => void;
  selectedServices: string[];
  selectedPackages: string[];
  selectedStylists: Record<string, string>;
  stylists: Stylist[];
  onCustomPackage?: (packageId: string, serviceId: string) => void;
  customizedServices?: Record<string, string[]>;
  locationId?: string;
  selectedDate?: Date;
  selectedTime?: string;
}

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  onServiceSelect,
  onPackageSelect,
  onStylistSelect,
  selectedServices,
  selectedPackages,
  selectedStylists,
  stylists,
  onCustomPackage,
  customizedServices = {},
  locationId,
  selectedDate,
  selectedTime
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedPackages, setExpandedPackages] = useState<string[]>([]);

  // Get staff availability when appointment time is selected
  const { availableStylists, isLoading: isLoadingAvailability } = useStaffAvailability({
    selectedDate,
    selectedTime,
    locationId,
  });

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

  const { data: services } = useQuery({
    queryKey: ['services', locationId],
    queryFn: async () => {
      let query = supabase
        .from('services')
        .select(`
          *,
          services_categories!inner(
            categories(id, name)
          )
        `)
        .eq('status', 'active');
      
      if (locationId) {
        // Get services associated with this location
        const { data: serviceLocations, error: serviceLocationsError } = await supabase
          .from('service_locations')
          .select('service_id')
          .eq('location_id', locationId);
        
        if (serviceLocationsError) throw serviceLocationsError;
        
        // If we have service locations, filter by them
        if (serviceLocations && serviceLocations.length > 0) {
          const serviceIds = serviceLocations.map(sl => sl.service_id);
          query = query.in('id', serviceIds);
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

  const { data: packages } = useQuery({
    queryKey: ['packages', locationId],
    queryFn: async () => {
      let query = supabase
        .from('packages')
        .select(`
          *,
          package_services(
            service:services(*),
            package_selling_price
          )
        `)
        .eq('status', 'active');

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

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

  const calculatePackagePrice = (pkg: any) => {
    const basePrice = pkg.price || 0;
    const customServices = customizedServices[pkg.id] || [];
    const additionalPrice = customServices.reduce((sum, serviceId) => {
      const service = services?.find(s => s.id === serviceId);
      return sum + (service?.selling_price || 0);
    }, 0);
    return basePrice + additionalPrice;
  };

  // Function to determine if a stylist is available
  const isStylistAvailable = (stylistId: string) => {
    if (!selectedDate || !selectedTime) return true; // If no date/time selected, all stylists are available
    return availableStylists.includes(stylistId);
  };

  const handlePackageSelect = (pkg: any) => {
    // Extract base service IDs from the package
    const baseServices = pkg?.package_services.map((ps: any) => ps.service.id);
    const currentCustomServices = customizedServices[pkg.id] || [];

    if (selectedPackages.includes(pkg.id)) {
      // If already selected, deselect the package
      onPackageSelect(pkg.id);
      setExpandedPackages(prev => prev.filter(id => id !== pkg.id));
    } else {
      // Expand the package view even if not selecting yet
      setExpandedPackages(prev => [...prev, pkg.id]);
      // Select the package and provide all service IDs (base + custom)
      onPackageSelect(pkg.id, [...baseServices, ...currentCustomServices]);
    }
  };

  // Get the price of a service within a package
  const getServicePriceInPackage = (packageId: string, serviceId: string) => {
    const pkg = packages?.find(p => p.id === packageId);
    if (!pkg) return 0;

    const packageService = pkg.package_services?.find(ps => ps.service.id === serviceId);
    if (packageService) {
      // Use package_selling_price if available, otherwise fall back to the service's selling_price
      return packageService.package_selling_price !== null && packageService.package_selling_price !== undefined
        ? packageService.package_selling_price
        : packageService.service.selling_price;
    }

    // For customized services not in the base package
    const service = services?.find(s => s.id === serviceId);
    return service?.selling_price || 0;
  };

  // Function to get service duration for availability calculations
  const getServiceDuration = (serviceId: string): number => {
    const service = services?.find(s => s.id === serviceId);
    return service?.duration || 60; // Default to 60 minutes if not found
  };

  // Update staff availability when a service is selected
  useEffect(() => {
    if (!selectedServices.length && !Object.keys(selectedStylists).length) return;
    
    // When services change, update the service duration in useStaffAvailability if needed
    const totalDuration = selectedServices.reduce((total, serviceId) => {
      return total + getServiceDuration(serviceId);
    }, 0);
    
    // Here you would refresh availability with the new duration if needed
    // This would require updating the useStaffAvailability hook with the service duration
  }, [selectedServices, selectedDate, selectedTime]);

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
              const isExpanded = isPackage && (selectedPackages.includes(item.id) || expandedPackages.includes(item.id));
              const isSelected = isService 
                ? selectedServices.includes(item.id)
                : isExpanded;

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
                      ₹{isService ? item.selling_price : calculatePackagePrice(item)}
                    </TableCell>
                    <TableCell>
                      {isService && isSelected && (
                        <TooltipProvider>
                          <Select 
                            value={selectedStylists[item.id] || ''} 
                            onValueChange={(value) => onStylistSelect(item.id, value)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select stylist" />
                            </SelectTrigger>
                            <SelectContent>
                              {stylists.map((stylist) => {
                                const available = isStylistAvailable(stylist.id);
                                return (
                                  <Tooltip key={stylist.id}>
                                    <TooltipTrigger asChild>
                                      <div className={cn("relative", !available && "opacity-50")}>
                                        <SelectItem value={stylist.id} disabled={!available}>
                                          <span className="flex items-center gap-2">
                                            {stylist.name}
                                            {!available && (
                                              <AlertCircle className="h-4 w-4 text-red-500" />
                                            )}
                                          </span>
                                        </SelectItem>
                                      </div>
                                    </TooltipTrigger>
                                    {!available && (
                                      <TooltipContent>
                                        <p>This stylist is not available at the selected time</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </TooltipProvider>
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
                              <div className="flex items-center gap-4">
                                <span className="text-sm font-medium">
                                  ₹{ps.package_selling_price !== null && ps.package_selling_price !== undefined
                                    ? ps.package_selling_price
                                    : ps.service.selling_price}
                                </span>
                                <TooltipProvider>
                                  <Select 
                                    value={selectedStylists[ps.service.id] || ''} 
                                    onValueChange={(value) => onStylistSelect(ps.service.id, value)}
                                  >
                                    <SelectTrigger className="w-[180px]">
                                      <SelectValue placeholder="Select stylist" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {stylists.map((stylist) => {
                                        const available = isStylistAvailable(stylist.id);
                                        return (
                                          <Tooltip key={stylist.id}>
                                            <TooltipTrigger asChild>
                                              <div className={cn("relative", !available && "opacity-50")}>
                                                <SelectItem value={stylist.id} disabled={!available}>
                                                  <span className="flex items-center gap-2">
                                                    {stylist.name}
                                                    {!available && (
                                                      <AlertCircle className="h-4 w-4 text-red-500" />
                                                    )}
                                                  </span>
                                                </SelectItem>
                                              </div>
                                            </TooltipTrigger>
                                            {!available && (
                                              <TooltipContent>
                                                <p>This stylist is not available at the selected time</p>
                                              </TooltipContent>
                                            )}
                                          </Tooltip>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                </TooltipProvider>
                              </div>
                            </div>
                          ))}
                          {item.is_customizable && (
                            <div className="pt-4 space-y-4">
                              <h4 className="font-medium text-sm">Additional Services</h4>
                              {services?.filter(service => 
                                item.customizable_services.includes(service.id)
                              ).map(service => (
                                <div
                                  key={service.id}
                                  className="flex items-center justify-between py-2"
                                >
                                  <div className="flex items-center gap-4">
                                    <Checkbox
                                      checked={customizedServices[item.id]?.includes(service.id)}
                                      onCheckedChange={() => onCustomPackage(item.id, service.id)}
                                    />
                                    <span className="text-sm font-medium">{service.name}</span>
                                    <span className="text-sm text-muted-foreground">
                                      ({service.duration} min)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className="text-sm font-medium">
                                      +₹{service.selling_price}
                                    </span>
                                    {customizedServices[item.id]?.includes(service.id) && (
                                      <TooltipProvider>
                                        <Select 
                                          value={selectedStylists[service.id] || ''} 
                                          onValueChange={(value) => onStylistSelect(service.id, value)}
                                        >
                                          <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select stylist" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {stylists.map((stylist) => {
                                              const available = isStylistAvailable(stylist.id);
                                              return (
                                                <Tooltip key={stylist.id}>
                                                  <TooltipTrigger asChild>
                                                    <div className={cn("relative", !available && "opacity-50")}>
                                                      <SelectItem value={stylist.id} disabled={!available}>
                                                        <span className="flex items-center gap-2">
                                                          {stylist.name}
                                                          {!available && (
                                                            <AlertCircle className="h-4 w-4 text-red-500" />
                                                          )}
                                                        </span>
                                                      </SelectItem>
                                                    </div>
                                                  </TooltipTrigger>
                                                  {!available && (
                                                    <TooltipContent>
                                                      <p>This stylist is not available at the selected time</p>
                                                    </TooltipContent>
                                                  )}
                                                </Tooltip>
                                              );
                                            })}
                                          </SelectContent>
                                        </Select>
                                      </TooltipProvider>
                                    )}
                                  </div>
                                </div>
                              ))}
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
      {isLoadingAvailability && (
        <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
          Loading stylist availability...
        </div>
      )}
    </div>
  );
};
