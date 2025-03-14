import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Users } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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

interface PackageGroup {
  package: any;
  cartItemId: string;
  services: PackageService[];
}

interface ServiceGroup {
  cartItemId: string;
  service: Service;
}

interface GroupedItems {
  packages: Record<string, PackageGroup>;
  services: ServiceGroup[];
}

interface ServiceSelectorProps {
  items: any[];
  selectedStylists: Record<string, string>;
  onStylistSelect: (serviceId: string, stylistId: string) => void;
  locationId?: string;
}

export function ServiceSelector({
  items,
  selectedStylists,
  onStylistSelect,
  locationId
}: ServiceSelectorProps) {
  const [itemsWithServices, setItemsWithServices] = useState<any[]>([]);

  const { data: employees } = useQuery({
    queryKey: ["employees", locationId],
    queryFn: async () => {
      let query = supabase
        .from("employees")
        .select(`
          *,
          employee_skills!inner(service_id),
          employee_locations(location_id)
        `)
        .eq("status", "active")
        .eq("employment_type", "stylist");
      
      if (locationId) {
        query = query.contains('employee_locations', [{ location_id: locationId }]);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    enabled: true
  });

  useEffect(() => {
    const processItems = async () => {
      const processedItems = items.map((item) => {
        let availableStylists: any[] = [];
        
        if (item.type === "service" && employees) {
          availableStylists = employees.filter((employee) =>
            employee.employee_skills.some(
              (skill: any) => skill.service_id === item.service.id
            )
          );
        } else if (item.type === "package" && employees) {
          const packageServiceIds = item.package.package_services?.map(
            (ps: any) => ps.service.id
          ) || [];
          
          if (packageServiceIds.length > 0) {
            availableStylists = employees.filter((employee) => {
              const employeeServiceIds = employee.employee_skills.map(
                (skill: any) => skill.service_id
              );
              return packageServiceIds.every((serviceId: string) =>
                employeeServiceIds.includes(serviceId)
              );
            });
          }
        }

        return {
          ...item,
          stylists: availableStylists,
        };
      });

      setItemsWithServices(processedItems);
    };

    if (items.length > 0 && employees) {
      processItems();
    }
  }, [items, employees]);

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

  const groupedItems = itemsWithServices.reduce((acc: GroupedItems, item) => {
    if (item.package_id && item.package) {
      const packageServices: PackageService[] = [];
      
      if (item.package.package_services) {
        packageServices.push(...item.package.package_services);
      }
      
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
    packages: {} as Record<string, PackageGroup>, 
    services: [] as ServiceGroup[] 
  });

  const getServicePrice = (service: Service, packageService?: PackageService): number => {
    if (packageService && packageService.package_selling_price !== undefined && packageService.package_selling_price !== null) {
      return packageService.package_selling_price;
    }
    return service.selling_price;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Select Stylists</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedItems.packages).map(([packageId, packageData]) => (
          <div key={packageId} className="space-y-4">
            <div className="font-semibold text-lg">
              {packageData.package.name}
            </div>
            <div className="space-y-3 pl-4">
              {packageData.services.map((ps: PackageService) => {
                const isPackageService = packageData.package.package_services.some(
                  basePs => basePs.service.id === ps.service.id
                );
                
                const basePackageService = isPackageService 
                  ? packageData.package.package_services.find(basePs => basePs.service.id === ps.service.id)
                  : undefined;
                
                const displayPrice = getServicePrice(ps.service, basePackageService);
                
                return (
                  <div 
                    key={`${packageData.cartItemId}-${ps.service.id}`}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{ps.service.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {ps.service.duration} minutes • ₹{displayPrice}
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
                        {employees?.map((employee) => (
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
            <Separator className="my-4" />
          </div>
        ))}

        {groupedItems.services.length > 0 && (
          <div className="space-y-4">
            <div className="font-semibold text-lg">
              Individual Services
            </div>
            <div className="space-y-3">
              {groupedItems.services.map(({ cartItemId, service }) => (
                <div 
                  key={cartItemId}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{service.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {service.duration} minutes • ₹{service.selling_price}
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
                      {employees?.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
