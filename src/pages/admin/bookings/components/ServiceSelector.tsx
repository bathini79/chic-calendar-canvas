
import React, { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useActiveServices } from "../hooks/useActiveServices";
import { useActivePackages } from "../hooks/useActivePackages";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Service, Package } from "../types";

interface ServiceSelectorProps {
  onServiceSelect: (serviceId: string) => void;
  onPackageSelect: (packageId: string) => void;
  onStylistSelect: (itemId: string, stylistId: string) => void;
  selectedServices: string[];
  selectedPackages: string[];
  selectedStylists: Record<string, string>;
  stylists: any[];
  onCustomPackage: (packageId: string, serviceId: string) => void; 
  customizedServices: Record<string, string[]>;
  locationId?: string;
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
  customizedServices,
  locationId
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: services = [], isLoading: isServicesLoading } = useActiveServices(locationId);
  const { data: packages = [], isLoading: isPackagesLoading } = useActivePackages(locationId);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const filteredServices = services.filter((service) => 
    service.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPackages = packages.filter((pkg) =>
    pkg.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group services by category
  const servicesByCategory: Record<string, Service[]> = {};
  filteredServices.forEach((service) => {
    let categoryName = "Uncategorized";
    
    if (service.category && service.category.length > 0 && service.category[0].category) {
      categoryName = service.category[0].category.name;
    }
    
    if (!servicesByCategory[categoryName]) {
      servicesByCategory[categoryName] = [];
    }
    servicesByCategory[categoryName].push(service as Service);
  });

  // Group packages by category
  const packagesByCategory: Record<string, Package[]> = {};
  filteredPackages.forEach((pkg) => {
    // Use the first category or "Uncategorized"
    let categoryName = "Uncategorized";
    
    if (pkg.categories && pkg.categories.length > 0 && pkg.categories[0].category) {
      categoryName = pkg.categories[0].category.name;
    }
    
    if (!packagesByCategory[categoryName]) {
      packagesByCategory[categoryName] = [];
    }
    packagesByCategory[categoryName].push(pkg as Package);
  });

  if (isServicesLoading || isPackagesLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <Input
          type="search"
          placeholder="Search services and packages..."
          className="pl-10"
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold mb-3">Services</h3>
          <Accordion type="multiple" className="w-full">
            {Object.keys(servicesByCategory).map((category) => (
              <AccordionItem value={category} key={category}>
                <AccordionTrigger>{category}</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    {servicesByCategory[category].map((service) => (
                      <div
                        key={service.id}
                        className={`p-3 rounded-md border ${
                          selectedServices.includes(service.id)
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{service.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {service.duration} min · ${service.selling_price}
                            </p>
                          </div>
                          <Button
                            variant={
                              selectedServices.includes(service.id)
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => onServiceSelect(service.id)}
                          >
                            {selectedServices.includes(service.id)
                              ? "Selected"
                              : "Select"}
                          </Button>
                        </div>

                        {selectedServices.includes(service.id) && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center">
                              <span className="text-sm font-medium mr-2">
                                Stylist:
                              </span>
                              <Select
                                value={
                                  selectedStylists[service.id] || "any"
                                }
                                onValueChange={(value) =>
                                  onStylistSelect(service.id, value)
                                }
                              >
                                <SelectTrigger className="w-[180px] h-8 text-xs">
                                  <SelectValue placeholder="Any stylist" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="any">
                                    Any available stylist
                                  </SelectItem>
                                  {stylists.map((stylist) => (
                                    <SelectItem
                                      key={stylist.id}
                                      value={stylist.id}
                                    >
                                      {stylist.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Packages</h3>
          <Accordion type="multiple" className="w-full">
            {Object.keys(packagesByCategory).map((category) => (
              <AccordionItem value={category} key={category}>
                <AccordionTrigger>{category}</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    {packagesByCategory[category].map((pkg) => (
                      <div
                        key={pkg.id}
                        className={`p-3 rounded-md border ${
                          selectedPackages.includes(pkg.id)
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{pkg.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              ${pkg.price}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {pkg.package_services?.map((ps: any) => (
                                <Badge
                                  key={ps.service.id}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {ps.service.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Button
                            variant={
                              selectedPackages.includes(pkg.id)
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => onPackageSelect(pkg.id)}
                          >
                            {selectedPackages.includes(pkg.id)
                              ? "Selected"
                              : "Select"}
                          </Button>
                        </div>

                        {selectedPackages.includes(pkg.id) && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center mb-3">
                              <span className="text-sm font-medium mr-2">
                                Stylist:
                              </span>
                              <Select
                                value={
                                  selectedStylists[pkg.id] || "any"
                                }
                                onValueChange={(value) =>
                                  onStylistSelect(pkg.id, value)
                                }
                              >
                                <SelectTrigger className="w-[180px] h-8 text-xs">
                                  <SelectValue placeholder="Any stylist" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="any">
                                    Any available stylist
                                  </SelectItem>
                                  {stylists.map((stylist) => (
                                    <SelectItem
                                      key={stylist.id}
                                      value={stylist.id}
                                    >
                                      {stylist.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {pkg.is_customizable && (
                              <div className="mt-3">
                                <h5 className="text-sm font-medium mb-2">
                                  Customize Package:
                                </h5>
                                <div className="space-y-2">
                                  {pkg.customizable_services?.map((serviceId: string) => {
                                    const service = services.find(s => s.id === serviceId);
                                    if (!service) return null;
                                    
                                    return (
                                      <div className="flex items-center space-x-2" key={serviceId}>
                                        <Checkbox 
                                          id={`${pkg.id}-${serviceId}`}
                                          checked={(customizedServices[pkg.id] || []).includes(serviceId)}
                                          onCheckedChange={() => onCustomPackage(pkg.id, serviceId)}
                                        />
                                        <Label 
                                          htmlFor={`${pkg.id}-${serviceId}`}
                                          className="text-sm font-normal"
                                        >
                                          {service.name} (+${service.selling_price})
                                        </Label>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
};
