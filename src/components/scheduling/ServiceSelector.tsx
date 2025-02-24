
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Service {
  id: string;
  name: string;
  duration: number;
  selling_price: number;
}

interface PackageService {
  service: Service;
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

interface ServiceSelectorProps {
  items: CartItem[];
  selectedStylists: Record<string, string>;
  onStylistSelect: (serviceId: string, stylistId: string) => void;
}

export function ServiceSelector({ items, selectedStylists, onStylistSelect }: ServiceSelectorProps) {
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

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('employment_type', 'stylist')
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    },
  });

  // Group items by package and standalone services
  const groupedItems = items.reduce((acc, item) => {
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
          .filter((s): s is PackageService => s !== null);
        
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

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Select Stylists</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Render Package Services */}
        {Object.entries(groupedItems.packages).map(([packageId, packageData]) => (
          <div key={packageId} className="space-y-4">
            <div className="font-semibold text-lg">
              {packageData.package.name}
            </div>
            <div className="space-y-3 pl-4">
              {packageData.services.map(({ service }) => (
                <div 
                  key={`${packageData.cartItemId}-${service.id}`}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{service.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {service.duration} minutes
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
            <Separator className="my-4" />
          </div>
        ))}

        {/* Render Individual Services */}
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
                      {service.duration} minutes
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
