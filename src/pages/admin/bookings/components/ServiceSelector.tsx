
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { 
  Package, 
  Search, 
  Check, 
  ChevronRight, 
  Clock, 
  User, 
  Tag,
  Sparkles
} from "lucide-react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPrice } from "@/lib/utils";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import type { Service, Package } from "../types";
import { useActiveServices } from "../hooks/useActiveServices";
import { useActivePackages } from "../hooks/useActivePackages";

interface ServiceSelectorProps {
  onServiceSelect: (serviceId: string) => void;
  onPackageSelect: (packageId: string) => void;
  onStylistSelect: (itemId: string, stylistId: string) => void;
  onCustomPackage: (packageId: string, serviceId: string) => void;
  selectedServices: string[];
  selectedPackages: string[];
  selectedStylists: Record<string, string>;
  customizedServices: Record<string, string[]>;
  stylists: any[];
  locationId?: string;
  membershipEligibleServices?: string[];
  membershipEligiblePackages?: string[];
  hasMembershipBenefits?: boolean;
}

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  onServiceSelect,
  onPackageSelect,
  onStylistSelect,
  onCustomPackage,
  selectedServices,
  selectedPackages,
  selectedStylists,
  customizedServices,
  stylists,
  locationId,
  membershipEligibleServices = [],
  membershipEligiblePackages = [],
  hasMembershipBenefits = false
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("services");
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null);
  
  const { data: services = [], isLoading: servicesLoading } = useActiveServices(locationId);
  const { data: packages = [], isLoading: packagesLoading } = useActivePackages(locationId);
  
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("name");
        
        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    
    fetchCategories();
  }, []);
  
  const filteredServices = services
    .filter((service) => {
      // Filter by search query
      const matchesSearch = 
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Filter by category
      const matchesCategory = 
        selectedCategory === "all" || 
        (service.category_id === selectedCategory);
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const filteredPackages = packages
    .filter((pkg) => {
      // Filter by search query
      const matchesSearch = 
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pkg.description && pkg.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Filter by category if categories are defined for packages
      const matchesCategory = 
        selectedCategory === "all" || 
        (pkg.categories && pkg.categories.includes(selectedCategory));
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  
  // Check if a service is eligible for membership discount
  const isServiceEligible = (serviceId: string) => {
    if (!hasMembershipBenefits) return false;
    
    // If no specific services are listed, all are eligible
    if (membershipEligibleServices.length === 0 && membershipEligiblePackages.length === 0) {
      return true;
    }
    
    return membershipEligibleServices.includes(serviceId);
  };
  
  // Check if a package is eligible for membership discount
  const isPackageEligible = (packageId: string) => {
    if (!hasMembershipBenefits) return false;
    
    // If no specific packages are listed, all are eligible
    if (membershipEligibleServices.length === 0 && membershipEligiblePackages.length === 0) {
      return true;
    }
    
    return membershipEligiblePackages.includes(packageId);
  };
  
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search services or packages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="focus-visible:outline-none">
          {servicesLoading ? (
            <div className="text-center py-6">Loading services...</div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              No services found
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-2">
                {filteredServices.map((service) => (
                  <div
                    key={service.id}
                    className={`p-4 border rounded-md cursor-pointer transition-colors ${
                      selectedServices.includes(service.id)
                        ? "border-primary bg-primary/10"
                        : isServiceEligible(service.id)
                          ? "border-green-300 bg-green-50 hover:bg-green-100/60"
                          : "hover:bg-gray-50"
                    }`}
                    onClick={() => onServiceSelect(service.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <h3 className="font-medium">{service.name}</h3>
                          {isServiceEligible(service.id) && (
                            <Badge className="ml-2 bg-green-500 hover:bg-green-600 text-white text-xs flex items-center gap-0.5">
                              <Sparkles className="h-3 w-3" />
                              <span>Membership</span>
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            {service.duration} min
                          </div>
                          <div className="flex items-center">
                            <Tag className="mr-1 h-3 w-3" />
                            {formatPrice(service.selling_price)}
                          </div>
                        </div>
                        {selectedServices.includes(service.id) && (
                          <div className="mt-2">
                            <label className="text-xs text-gray-500 mb-1 block">
                              Assign Stylist
                            </label>
                            <Select
                              value={selectedStylists[service.id] || ""}
                              onValueChange={(value) => onStylistSelect(service.id, value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select a stylist" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="any">Any Available</SelectItem>
                                {stylists.map((stylist) => (
                                  <SelectItem key={stylist.id} value={stylist.id}>
                                    {stylist.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center h-5">
                        {selectedServices.includes(service.id) && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="packages" className="focus-visible:outline-none">
          {packagesLoading ? (
            <div className="text-center py-6">Loading packages...</div>
          ) : filteredPackages.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              No packages found
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-2">
                {filteredPackages.map((pkg) => (
                  <Collapsible
                    key={pkg.id}
                    open={expandedPackage === pkg.id}
                    onOpenChange={(isOpen) => setExpandedPackage(isOpen ? pkg.id : null)}
                  >
                    <div
                      className={`p-4 border rounded-md cursor-pointer transition-colors ${
                        selectedPackages.includes(pkg.id)
                          ? "border-primary bg-primary/5"
                          : isPackageEligible(pkg.id)
                            ? "border-green-300 bg-green-50 hover:bg-green-100/60"
                            : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div
                          className="flex-1"
                          onClick={() => onPackageSelect(pkg.id)}
                        >
                          <div className="flex items-center">
                            <h3 className="font-medium">{pkg.name}</h3>
                            {isPackageEligible(pkg.id) && (
                              <Badge className="ml-2 bg-green-500 hover:bg-green-600 text-white text-xs flex items-center gap-0.5">
                                <Sparkles className="h-3 w-3" />
                                <span>Membership</span>
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mt-1">
                            <div className="flex items-center">
                              <Package className="mr-1 h-3 w-3" />
                              {pkg.package_services?.length || 0} services
                            </div>
                            {pkg.duration && (
                              <div className="flex items-center">
                                <Clock className="mr-1 h-3 w-3" />
                                {pkg.duration} min
                              </div>
                            )}
                            <div className="flex items-center">
                              <Tag className="mr-1 h-3 w-3" />
                              {formatPrice(pkg.price)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {selectedPackages.includes(pkg.id) && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                          <CollapsibleTrigger asChild>
                            <ChevronRight
                              className={`h-5 w-5 text-gray-400 transition-transform ${
                                expandedPackage === pkg.id ? "rotate-90" : ""
                              }`}
                            />
                          </CollapsibleTrigger>
                        </div>
                      </div>
                      
                      {selectedPackages.includes(pkg.id) && (
                        <div className="mt-2">
                          <label className="text-xs text-gray-500 mb-1 block">
                            Assign Stylist
                          </label>
                          <Select
                            value={selectedStylists[pkg.id] || ""}
                            onValueChange={(value) => onStylistSelect(pkg.id, value)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select a stylist" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">Any Available</SelectItem>
                              {stylists.map((stylist) => (
                                <SelectItem key={stylist.id} value={stylist.id}>
                                  {stylist.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    
                    <CollapsibleContent className="px-4 py-2 border-x border-b rounded-b-md -mt-[1px]">
                      <div className="space-y-2 py-2">
                        <h4 className="text-sm font-medium">Included Services</h4>
                        <div className="space-y-1">
                          {pkg.package_services?.map((ps) => (
                            <div
                              key={ps.service.id}
                              className="flex items-center justify-between py-1 px-2 text-sm rounded hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-1">
                                <span>{ps.service.name}</span>
                                <span className="text-xs text-gray-500">
                                  ({ps.service.duration} min)
                                </span>
                              </div>
                              {selectedPackages.includes(pkg.id) && (
                                <Select
                                  value={selectedStylists[ps.service.id] || selectedStylists[pkg.id] || ""}
                                  onValueChange={(value) => onStylistSelect(ps.service.id, value)}
                                >
                                  <SelectTrigger className="h-7 w-32">
                                    <SelectValue placeholder="Stylist" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="any">Any Available</SelectItem>
                                    {stylists.map((stylist) => (
                                      <SelectItem key={stylist.id} value={stylist.id}>
                                        {stylist.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {pkg.is_customizable && (
                          <div className="mt-4 pt-2 border-t">
                            <h4 className="text-sm font-medium mb-2">Additional Services</h4>
                            <div className="space-y-1">
                              {pkg.customizable_services?.filter(id => {
                                // Only show services that aren't already part of the package
                                const isIncluded = pkg.package_services?.some(ps => ps.service.id === id);
                                return !isIncluded;
                              }).map((serviceId) => {
                                const service = services.find(s => s.id === serviceId);
                                if (!service) return null;
                                
                                const isSelected = customizedServices[pkg.id]?.includes(serviceId);
                                
                                return (
                                  <div
                                    key={serviceId}
                                    className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => onCustomPackage(pkg.id, serviceId)}
                                      />
                                      <span className="text-sm">{service.name}</span>
                                      <span className="text-xs text-gray-500">
                                        ({service.duration} min)
                                      </span>
                                    </div>
                                    <div className="text-sm">
                                      {formatPrice(service.selling_price)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
