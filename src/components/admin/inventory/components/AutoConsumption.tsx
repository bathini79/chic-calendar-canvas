
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Trash2, Plus, MapPin } from "lucide-react";
import { toast } from "sonner";
import { LocationSelector } from "@/components/admin/dashboard/LocationSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit_of_quantity: string;
}

interface LocationInventoryItem {
  id: string;
  item_id: string;
  location_id: string;
  quantity: number;
  item: {
    name: string;
    unit_of_quantity: string;
  };
}

interface Service {
  id: string;
  name: string;
  category_id: string;
}

interface ServicePackage {
  id: string;
  name: string;
  package_services: {
    service: Service;
  }[];
}

interface ServiceRequirement {
  id?: string;
  serviceId: string;
  serviceName: string;
  items: {
    id: string;
    itemId: string;
    itemName: string;
    quantity: number;
  }[];
}

interface ExistingRequirement {
  id: string;
  service_id: string;
  item_id: string;
  quantity_required: number;
  service: {
    name: string;
  };
  item: {
    name: string;
    unit_of_quantity: string;
  };
}

interface ItemInput {
  itemId: string;
  quantity: number;
}

interface Location {
  id: string;
  name: string;
}

export function AutoConsumption() {
  const [activeTab, setActiveTab] = useState<"services" | "packages">("services");
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedPackage, setSelectedPackage] = useState<string>("");
  const [requirements, setRequirements] = useState<ServiceRequirement[]>([]);
  const [itemInputs, setItemInputs] = useState<ItemInput[]>([{ itemId: "", quantity: 1 }]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  // Fetch locations
  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .eq("is_active", true);

      if (error) throw error;
      return data as Location[];
    },
  });

  useEffect(() => {
    if (locations && locations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  // Fetch services
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, category_id")
        .eq("status", "active");

      if (error) throw error;
      return data as Service[];
    },
  });

  // Fetch packages
  const { data: packages, isLoading: packagesLoading } = useQuery({
    queryKey: ["packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select(`
          id, 
          name,
          package_services (
            service:services (
              id,
              name,
              category_id
            )
          )
        `)
        .eq("status", "active");

      if (error) throw error;
      return data as ServicePackage[];
    },
  });

  // Fetch inventory items for the selected location
  const { 
    data: locationInventoryItems, 
    isLoading: locationItemsLoading, 
    refetch: refetchLocationInventory 
  } = useQuery({
    queryKey: ["location_inventory_items", selectedLocationId],
    queryFn: async () => {
      if (!selectedLocationId) return [];
      
      const { data, error } = await supabase
        .from("inventory_location_items")
        .select(`
          id,
          item_id,
          location_id,
          quantity,
          item:inventory_items (name, unit_of_quantity)
        `)
        .eq("location_id", selectedLocationId);

      if (error) throw error;
      return data as LocationInventoryItem[];
    },
    enabled: !!selectedLocationId,
  });

  // Fetch existing service inventory requirements
  const {
    data: existingRequirements,
    isLoading: requirementsLoading,
    refetch: refetchRequirements,
  } = useQuery({
    queryKey: ["service_inventory_requirements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_inventory_requirements")
        .select(`
          id,
          service_id,
          item_id,
          quantity_required,
          service:services (name),
          item:inventory_items (name, unit_of_quantity)
        `);

      if (error) throw error;
      return data as ExistingRequirement[];
    },
  });

  // Load existing requirements into state
  useEffect(() => {
    if (existingRequirements) {
      // Group by service_id
      const groupedRequirements = existingRequirements.reduce((acc: Record<string, ServiceRequirement>, req) => {
        if (!acc[req.service_id]) {
          acc[req.service_id] = {
            id: req.id,
            serviceId: req.service_id,
            serviceName: req.service.name,
            items: [],
          };
        }

        acc[req.service_id].items.push({
          id: req.id,
          itemId: req.item_id,
          itemName: req.item.name,
          quantity: req.quantity_required,
        });

        return acc;
      }, {});

      setRequirements(Object.values(groupedRequirements));
    }
  }, [existingRequirements]);

  const handleAddItem = () => {
    setItemInputs([...itemInputs, { itemId: "", quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItemInputs(itemInputs.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'itemId' | 'quantity', value: string | number) => {
    const newItemInputs = [...itemInputs];
    if (field === 'itemId') {
      newItemInputs[index].itemId = value as string;
    } else if (field === 'quantity') {
      newItemInputs[index].quantity = value as number;
    }
    setItemInputs(newItemInputs);
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
  };

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackage(packageId);
  };

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocationId(locationId);
  };

  const handleSaveRequirements = async () => {
    if (!selectedService && activeTab === "services") {
      toast.error("Please select a service");
      return;
    }

    if (!selectedPackage && activeTab === "packages") {
      toast.error("Please select a package");
      return;
    }

    if (itemInputs.some(item => !item.itemId)) {
      toast.error("Please select all items");
      return;
    }

    try {
      if (activeTab === "services") {
        // Get service name
        const service = services?.find(s => s.id === selectedService);
        if (!service) {
          toast.error("Service not found");
          return;
        }

        // Prepare data for insertion
        const insertData = itemInputs.map(item => ({
          service_id: selectedService,
          item_id: item.itemId,
          quantity_required: item.quantity,
        }));

        // Insert data
        const { error } = await supabase
          .from('service_inventory_requirements')
          .upsert(insertData, {
            onConflict: 'service_id,item_id',
            ignoreDuplicates: false
          });

        if (error) throw error;

        toast.success(`Requirements saved for ${service.name}`);
      } else if (activeTab === "packages") {
        // Get package
        const pkg = packages?.find(p => p.id === selectedPackage);
        if (!pkg) {
          toast.error("Package not found");
          return;
        }

        // For packages, we need to add requirements for each service in the package
        const allInserts = [];
        for (const packageService of pkg.package_services) {
          const serviceId = packageService.service.id;
          
          // Each item in the package needs to be associated with this service
          for (const item of itemInputs) {
            allInserts.push({
              service_id: serviceId,
              item_id: item.itemId,
              quantity_required: item.quantity,
            });
          }
        }

        // Insert data
        const { error } = await supabase
          .from('service_inventory_requirements')
          .upsert(allInserts, {
            onConflict: 'service_id,item_id',
            ignoreDuplicates: false
          });

        if (error) throw error;

        toast.success(`Requirements saved for ${pkg.name} package`);
      }

      // Reset form
      setSelectedService("");
      setSelectedPackage("");
      setItemInputs([{ itemId: "", quantity: 1 }]);
      refetchRequirements();
      refetchLocationInventory(); // Refresh inventory items after updating requirements

    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteRequirement = async (requirementId: string) => {
    try {
      const { error } = await supabase
        .from('service_inventory_requirements')
        .delete()
        .eq('id', requirementId);

      if (error) throw error;

      toast.success("Requirement deleted");
      refetchRequirements();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (servicesLoading || locationItemsLoading || packagesLoading || requirementsLoading || locationsLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Auto Consumption Rules</h2>
        <div className="flex items-center space-x-2">
          <LocationSelector 
            locations={locations || []}
            value={selectedLocationId}
            onChange={handleLocationSelect}
            includeAllOption={false}
          />
        </div>
      </div>

      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "services" | "packages")}>
          <TabsList>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="packages">Packages</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="service">Select Service</Label>
              <Select
                value={selectedService}
                onValueChange={handleServiceSelect}
              >
                <SelectTrigger id="service">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services?.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="packages" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="package">Select Package</Label>
              <Select
                value={selectedPackage}
                onValueChange={handlePackageSelect}
              >
                <SelectTrigger id="package">
                  <SelectValue placeholder="Select a package" />
                </SelectTrigger>
                <SelectContent>
                  {packages?.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPackage && (
              <div className="bg-secondary/20 p-4 rounded-md space-y-2">
                <h3 className="text-sm font-medium">Services in this package:</h3>
                <ul className="list-disc list-inside text-sm">
                  {packages?.find(p => p.id === selectedPackage)?.package_services.map((ps) => (
                    <li key={ps.service.id}>{ps.service.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Add Items Required</h3>
          </div>

          <div className="space-y-3">
            {itemInputs.map((input, index) => (
              <div key={index} className="flex items-end gap-3">
                <div className="flex-1">
                  <Label className="text-xs">Item</Label>
                  <Select
                    value={input.itemId || undefined}
                    onValueChange={(value) => handleItemChange(index, 'itemId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an item" />
                    </SelectTrigger>
                    <SelectContent>
                      {locationInventoryItems?.map((item) => (
                        <SelectItem key={item.item_id} value={item.item_id}>
                          {item.item.name} ({item.quantity} {item.item.unit_of_quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-24">
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={input.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                  />
                </div>
                
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRemoveItem(index)}
                  disabled={itemInputs.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Add Item
            </Button>
            
            <Button onClick={handleSaveRequirements}>
              Save Requirements
            </Button>
          </div>
        </div>
      </Card>

      <h2 className="text-lg font-semibold mt-8">Existing Consumption Requirements</h2>
      
      {requirements.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requirements.map((req) => (
              <React.Fragment key={req.serviceId}>
                {req.items.map((item, itemIndex) => (
                  <TableRow key={`${req.serviceId}-${item.itemId}`}>
                    {itemIndex === 0 ? (
                      <TableCell rowSpan={req.items.length} className="align-top">
                        {req.serviceName}
                      </TableCell>
                    ) : null}
                    <TableCell>{item.itemName}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRequirement(item.id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No consumption requirements configured yet.
        </div>
      )}
    </div>
  );
}
