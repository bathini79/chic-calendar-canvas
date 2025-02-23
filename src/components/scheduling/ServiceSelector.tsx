import { Button } from "@/components/ui/button";
import { Employee } from "@/pages/admin/bookings/types";
import { useActiveServices } from "@/pages/admin/bookings/hooks/useActiveServices";
import { useActivePackages } from "@/pages/admin/bookings/hooks/useActivePackages";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface ServiceSelectorProps {
  selectedServices: string[];
  selectedPackages: string[];
  selectedStylists: Record<string, string>;
  stylists: Employee[];
  onServiceSelect?: (serviceId: string) => void;
  onPackageSelect?: (packageId: string) => void;
  onStylistSelect: (itemId: string, stylistId: string) => void;
  onCustomPackage?: (packageId: string, serviceId: string) => void;
  customizedServices?: Record<string, string[]>;
}

export const ServiceSelector = ({
  selectedServices,
  selectedPackages,
  selectedStylists,
  stylists,
  onServiceSelect,
  onPackageSelect,
  onStylistSelect,
  onCustomPackage,
  customizedServices = {}
}: ServiceSelectorProps) => {
  const { data: services } = useActiveServices();
  const { data: packages } = useActivePackages();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Services</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services?.map((service) => (
            <Card key={service.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedServices.includes(service.id)}
                      onCheckedChange={() => onServiceSelect?.(service.id)}
                    />
                    <h4 className="font-medium">{service.name}</h4>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="secondary">{service.duration} mins</Badge>
                    <Badge variant="secondary">${service.selling_price}</Badge>
                  </div>
                </div>
              </div>
              {selectedServices.includes(service.id) && (
                <div className="mt-4">
                  <Select
                    value={selectedStylists[service.id] || ""}
                    onValueChange={(value) => onStylistSelect(service.id, value)}
                  >
                    <SelectTrigger>
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
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Packages</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {packages?.map((pkg) => (
            <Card key={pkg.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedPackages.includes(pkg.id)}
                      onCheckedChange={() => onPackageSelect?.(pkg.id)}
                    />
                    <h4 className="font-medium">{pkg.name}</h4>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{pkg.description}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="secondary">{pkg.duration} mins</Badge>
                    <Badge variant="secondary">${pkg.price}</Badge>
                  </div>
                </div>
              </div>
              {selectedPackages.includes(pkg.id) && (
                <div className="mt-4 space-y-4">
                  <Select
                    value={selectedStylists[pkg.id] || ""}
                    onValueChange={(value) => onStylistSelect(pkg.id, value)}
                  >
                    <SelectTrigger>
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

                  {pkg.is_customizable && pkg.customizable_services && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Customize Package:</h5>
                      {services
                        ?.filter((service) =>
                          pkg.customizable_services.includes(service.id)
                        )
                        .map((service) => (
                          <div key={service.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={(customizedServices[pkg.id] || []).includes(
                                service.id
                              )}
                              onCheckedChange={() =>
                                onCustomPackage?.(pkg.id, service.id)
                              }
                            />
                            <span className="text-sm">{service.name}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
