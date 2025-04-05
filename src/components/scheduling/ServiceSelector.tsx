
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp, Package, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/CartContext";

interface Service {
  id: string;
  name: string;
  duration: number;
  selling_price: number;
}

interface PackageService {
  service: Service;
  package_selling_price?: number;
}

interface Package {
  id: string;
  name: string;
  package_services: PackageService[];
  duration: number;
  price: number;
}

interface CartItem {
  id: string;
  service_id?: string;
  package_id?: string;
  service?: Service;
  package?: Package;
  customized_services?: string[];
  selling_price: number;
}

interface Employee {
  id: string;
  name: string;
}

interface ServiceSelectorProps {
  items: CartItem[];
  selectedStylists: Record<string, string>;
  onStylistSelect: (serviceId: string, stylistId: string) => void;
}

export function ServiceSelector({ items, selectedStylists, onStylistSelect }: ServiceSelectorProps) {
  const [expandedPackages, setExpandedPackages] = useState<Record<string, boolean>>({});
  const [expandedIndividualServices, setExpandedIndividualServices] = useState(false);
  const { selectedLocation } = useCart();

  // Query for additional services that might be customized in packages
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*');
      
      if (error) throw error;
      return data;
    },
    enabled: items.some(item => item.customized_services?.length > 0)
  });

  // Fetch employees that are assigned to the current location and the specific services
  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees-for-services', selectedLocation, items],
    queryFn: async () => {
      // Extract all service IDs from cart items (both individual services and from packages)
      const serviceIds: string[] = [];
      
      items.forEach(item => {
        // Add individual service IDs
        if (item.service_id) {
          serviceIds.push(item.service_id);
        }
        
        // Add service IDs from packages
        if (item.package?.package_services) {
          item.package.package_services.forEach(ps => {
            if (ps.service.id) {
              serviceIds.push(ps.service.id);
            }
          });
        }
        
        // Add customized service IDs
        if (item.customized_services?.length) {
          serviceIds.push(...item.customized_services);
        }
      });
      
      // If no services or no location, return empty array
      if (serviceIds.length === 0 || !selectedLocation) {
        return [];
      }
      
      // First get employees assigned to the location
      const { data: locationEmployees, error: locationError } = await supabase
        .from('employees')
        .select(`
          *,
          employee_locations!inner(*)
        `)
        .eq('employment_type', 'stylist')
        .eq('status', 'active')
        .eq('employee_locations.location_id', selectedLocation);
        
      if (locationError) throw locationError;
      if (!locationEmployees?.length) return [];
      
      // Get employee IDs
      const employeeIds = locationEmployees.map(emp => emp.id);
      
      // Then get employees who have skills for these services
      const { data: skillsData, error: skillsError } = await supabase
        .from('employee_skills')
        .select('employee_id, service_id')
        .in('employee_id', employeeIds)
        .in('service_id', serviceIds);
        
      if (skillsError) throw skillsError;
      
      // Create a map of service_id -> employee_ids who can perform that service
      const serviceEmployeeMap: Record<string, string[]> = {};
      
      skillsData?.forEach(skill => {
        if (!serviceEmployeeMap[skill.service_id]) {
          serviceEmployeeMap[skill.service_id] = [];
        }
        serviceEmployeeMap[skill.service_id].push(skill.employee_id);
      });
      
      // Create a map of employee_id -> services they can perform
      const employeeServiceMap: Record<string, string[]> = {};
      
      skillsData?.forEach(skill => {
        if (!employeeServiceMap[skill.employee_id]) {
          employeeServiceMap[skill.employee_id] = [];
        }
        employeeServiceMap[skill.employee_id].push(skill.service_id);
      });
      
      // Return all employees that are assigned to the location,
      // with a new property showing which services they can perform
      return locationEmployees.map(emp => ({
        ...emp,
        services: employeeServiceMap[emp.id] || []
      }));
    },
    enabled: !!selectedLocation && items.length > 0
  });

  // Group items by package and standalone services
  const groupedItems = items.reduce((acc: any, item) => {
    if (item.package_id && item.package) {
      const packageServices: PackageService[] = [];
      
      // Add regular package services
      if (item.package.package_services) {
        packageServices.push(...item.package.package_services);
      }
      
      // Add customized services
      if (item.customized_services?.length && services) {
        const customizedServiceObjects = item.customized_services
          .map(serviceId => {
            const service = services.find(s => s.id === serviceId);
            return service ? { service } : null;
          })
          .filter(Boolean) as PackageService[];
        
        packageServices.push(...customizedServiceObjects);
      }

      acc.packages[item.package_id] = {
        package: item.package,
        cartItemId: item.id,
        services: packageServices
      };
    } else if (item.service) {
      acc.services.push({
        cartItemId: item.id,
        service: item.service
      });
    }
    return acc;
  }, { 
    packages: {} as Record<string, {
      package: Package;
      cartItemId: string;
      services: PackageService[];
    }>, 
    services: [] as Array<{
      cartItemId: string;
      service: Service;
    }> 
  });

  const togglePackageExpansion = (packageId: string) => {
    setExpandedPackages(prev => ({
      ...prev,
      [packageId]: !prev[packageId]
    }));
  };

  const toggleIndividualServicesExpansion = () => {
    setExpandedIndividualServices(!expandedIndividualServices);
  };

  // Get the price for a service, prioritizing package_selling_price if available
  const getServicePrice = (service: Service, packageService?: PackageService): number => {
    if (packageService && packageService.package_selling_price !== undefined && packageService.package_selling_price !== null) {
      return packageService.package_selling_price;
    }
    return service.selling_price;
  };

  // Calculate total services across all items
  const totalServices = Object.values(groupedItems.packages).reduce(
    (total, pkg) => total + pkg.services.length, 0
  ) + groupedItems.services.length;

  // Format duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ""}`;
    }
    return `${remainingMinutes}m`;
  };

  // Get employees who can perform a specific service
  const getEmployeesForService = (serviceId: string) => {
    if (!employees || !serviceId) return [];
    
    // If we have skills data, filter employees who can perform this service
    return employees.filter(emp => 
      // Either the employee has the skill for this service
      emp.services.includes(serviceId) ||
      // Or the employee has no specific skill assignments (can do everything)
      emp.services.length === 0
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Select Stylists</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Render Package Services */}
        {Object.entries(groupedItems.packages).map(([packageId, packageData]) => (
          <div key={packageId} className="space-y-4">
            <Button 
              variant="ghost" 
              className="w-full justify-between p-2 h-auto" 
              onClick={() => togglePackageExpansion(packageId)}
            >
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col items-start">
                  <span className="font-semibold">{packageData.package.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {packageData.services.length} services • {formatDuration(packageData.package.duration || 0)}
                  </span>
                </div>
              </div>
              {expandedPackages[packageId] ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            
            {expandedPackages[packageId] && (
              <div className="space-y-3 pl-4">
                {packageData.services.map((ps: PackageService) => {
                  // Determine if this is a package service with package_selling_price
                  const isPackageService = packageData.package.package_services.some(
                    basePs => basePs.service.id === ps.service.id
                  );
                  
                  // Get the corresponding base package service if exists
                  const basePackageService = isPackageService 
                    ? packageData.package.package_services.find(basePs => basePs.service.id === ps.service.id)
                    : undefined;
                  
                  // Calculate the display price
                  const displayPrice = getServicePrice(ps.service, basePackageService);
                  
                  // Get available employees for this service
                  const availableEmployees = getEmployeesForService(ps.service.id);
                  
                  return (
                    <div 
                      key={`${packageData.cartItemId}-${ps.service.id}`}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{ps.service.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDuration(ps.service.duration)} • ₹{displayPrice}
                        </p>
                      </div>
                      <Select 
                        value={selectedStylists[ps.service.id] || ''} 
                        onValueChange={(value) => onStylistSelect(ps.service.id, value)}
                      >
                        <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue placeholder="Select stylist" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any Available Stylist</SelectItem>
                          {availableEmployees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            )}
            <Separator className="my-4" />
          </div>
        ))}

        {/* Render Individual Services */}
        {groupedItems.services.length > 0 && (
          <div className="space-y-4">
            <Button 
              variant="ghost" 
              className="w-full justify-between p-2 h-auto" 
              onClick={toggleIndividualServicesExpansion}
            >
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col items-start">
                  <span className="font-semibold">Individual Services</span>
                  <span className="text-xs text-muted-foreground">
                    {groupedItems.services.length} services
                  </span>
                </div>
              </div>
              {expandedIndividualServices ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            
            {expandedIndividualServices && (
              <div className="space-y-3 pl-4">
                {groupedItems.services.map(({ cartItemId, service }) => {
                  // Get available employees for this service
                  const availableEmployees = getEmployeesForService(service.id);
                  
                  return (
                    <div 
                      key={cartItemId}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{service.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDuration(service.duration)} • ₹{service.selling_price}
                        </p>
                      </div>
                      <Select 
                        value={selectedStylists[service.id] || ''} 
                        onValueChange={(value) => onStylistSelect(service.id, value)}
                      >
                        <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue placeholder="Select stylist" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any Available Stylist</SelectItem>
                          {availableEmployees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
