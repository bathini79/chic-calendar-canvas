
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

interface Package {
  id: string;
  name: string;
  package_services: Array<{
    service: Service;
  }>;
}

interface CartItem {
  id: string;
  service_id?: string;
  package_id?: string;
  service?: Service;
  package?: Package;
  selling_price: number;
}

interface ServiceSelectorProps {
  items: CartItem[];
  selectedStylists: Record<string, string>;
  onStylistSelect: (serviceId: string, stylistId: string) => void;
}

export function ServiceSelector({ items, selectedStylists, onStylistSelect }: ServiceSelectorProps) {
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
      if (!acc.packages[item.package_id]) {
        acc.packages[item.package_id] = {
          package: item.package,
          cartItemId: item.id,
          services: item.package.package_services || []
        };
      }
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
      services: Array<{service: Service}>;
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
