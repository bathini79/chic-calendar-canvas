
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface ServiceSelectorProps {
  items: Array<{
    id: string;
    service_id?: string;
    package_id?: string;
    service?: {
      id: string;
      name: string;
      duration: number;
    };
    package?: {
      id: string;
      name: string;
      package_services?: Array<{
        service: {
          id: string;
          name: string;
          duration: number;
        };
      }>;
    };
  }>;
  selectedStylists: Record<string, string>;
  onStylistSelect: (itemId: string, stylistId: string) => void;
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

  // Group items by package
  const groupedItems = items.reduce((acc, item) => {
    if (item.package_id) {
      if (!acc.packages[item.package_id]) {
        acc.packages[item.package_id] = {
          package: item.package,
          services: []
        };
      }
      // Add package services
      if (item.package?.package_services) {
        acc.packages[item.package_id].services = item.package.package_services.map(ps => ({
          id: ps.service.id,
          name: ps.service.name,
          duration: ps.service.duration
        }));
      }
    } else if (item.service) {
      acc.services.push({
        id: item.id,
        service: item.service
      });
    }
    return acc;
  }, { packages: {} as Record<string, any>, services: [] as any[] });

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Select Stylists</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Render Package Services */}
        {Object.entries(groupedItems.packages).map(([packageId, packageData]: [string, any]) => (
          <div key={packageId} className="space-y-4">
            <div className="font-semibold text-lg">
              {packageData.package.name}
            </div>
            <div className="space-y-3 pl-4">
              {packageData.services.map((service: any) => (
                <div 
                  key={service.id}
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
              {groupedItems.services.map((item: any) => (
                <div 
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{item.service.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.service.duration} minutes
                    </p>
                  </div>
                  <Select 
                    value={selectedStylists[item.id] || ''} 
                    onValueChange={(value) => onStylistSelect(item.id, value)}
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
