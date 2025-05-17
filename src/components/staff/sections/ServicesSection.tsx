import React, { useState, useEffect } from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface ServicesSectionProps {
  form: UseFormReturn<any>;
  selectedSkills: string[];
  setSelectedSkills: React.Dispatch<React.SetStateAction<string[]>>;
  employmentTypes?: any[];
  isMobile?: boolean;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  price?: number;
  duration?: number;
}

interface ServiceLocation {
  service_id: string;
  location_id: string;
}

interface Location {
  id: string;
  name: string;
}

export function ServicesSection({
  form,
  selectedSkills,
  setSelectedSkills,
  employmentTypes = [],
  isMobile = false,
}: ServicesSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceLocations, setServiceLocations] = useState<
    Record<string, string[]>
  >({});
  const [locationError, setLocationError] = useState<string | null>(null);
  const [commonLocation, setCommonLocation] = useState<string | null>(null);

  // Fetch all services
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch service locations
  const { data: locationData = [] } = useQuery<ServiceLocation[]>({
    queryKey: ["service_locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_locations")
        .select("service_id, location_id");

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch location names for better error messages
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name");

      if (error) throw error;
      return data || [];
    },
  });

  // Process location data to create a map of service_id -> location_ids
  useEffect(() => {
    if (locationData.length > 0) {
      const locMap: Record<string, string[]> = {};

      locationData.forEach((item) => {
        if (!locMap[item.service_id]) {
          locMap[item.service_id] = [];
        }
        locMap[item.service_id].push(item.location_id);
      });

      setServiceLocations(locMap);
    }
  }, [locationData]);

  // Validate locations when selected services change
  useEffect(() => {
    if (selectedSkills.length > 1 && Object.keys(serviceLocations).length > 0) {
      validateServiceLocations(selectedSkills);
    } else {
      setLocationError(null);
      setCommonLocation(null);
    }
  }, [selectedSkills, serviceLocations]);

  // Function to validate that all selected services share at least one location
  const validateServiceLocations = (serviceIds: string[]) => {
    if (serviceIds.length <= 1 || Object.keys(serviceLocations).length === 0) {
      setLocationError(null);
      setCommonLocation(null);
      return true;
    }

    // Get locations for first service
    const firstServiceLocations = serviceLocations[serviceIds[0]] || [];

    // Check if all other services share at least one location with the first service
    let commonLocations = [...firstServiceLocations];

    for (let i = 1; i < serviceIds.length; i++) {
      const currentServiceLocations = serviceLocations[serviceIds[i]] || [];
      commonLocations = commonLocations.filter((loc) =>
        currentServiceLocations.includes(loc)
      );

      if (commonLocations.length === 0) {
        const serviceNames = serviceIds
          .map((id) => services?.find((s) => s.id === id)?.name || id)
          .join(", ");

        setLocationError(
          `The selected services (${serviceNames}) do not share a common location. Please select services from the same location only.`
        );
        setCommonLocation(null);
        return false;
      }
    }

    // If we have a common location, store it
    if (commonLocations.length > 0) {
      setCommonLocation(commonLocations[0]);
    }

    setLocationError(null);
    return true;
  };
  const handleServiceSelect = (serviceId: string, isChecked: boolean) => {
    if (isChecked) {
      // Special handling for selecting "all" services
      if (serviceId === "all") {
        // Get all services from the database and select them
        supabase
          .from("services")
          .select("id")
          .then(({ data, error }) => {
            if (!error && data) {
              const allServiceIds = data.map((s) => s.id);
              setSelectedSkills(allServiceIds);
              form.setValue("skills", allServiceIds);
            } else {
              console.error("Error fetching services:", error);
            }
          });
      } else {
        setSelectedSkills((prev) => [...prev, serviceId]);
        form.setValue("skills", [...selectedSkills, serviceId]);
      }
    } else {
      // Special handling for unchecking "all" services
      if (serviceId === "all") {
        setSelectedSkills([]);
        form.setValue("skills", []);
      } else {
        setSelectedSkills((prev) => prev.filter((id) => id !== serviceId));
        form.setValue(
          "skills",
          selectedSkills.filter((id) => id !== serviceId)
        );
      }
    }
  };

  // Filter services based on search query
  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <div className={`${isMobile ? "p-3 min-h-[300px]" : "p-6 min-h-[500px]"}`}>
      <div className={`${isMobile ? "mb-3" : "mb-6"}`}>
        <h2 className="text-xl font-medium mb-1">Services</h2>
        <p className="text-sm text-muted-foreground">
          Manage services this staff member can provide
        </p>
      </div>

      <FormField
        control={form.control}
        name="skills"
        render={() => (
          <FormItem>
            {" "}
            <FormLabel className="mb-2">Services & Skills</FormLabel>{" "}
            {form.formState.errors.skills && (
              <FormMessage className="mt-1">
                {form.formState.errors.skills.message?.toString()}
              </FormMessage>
            )}
            <FormControl>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search services..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>{" "}
                <div className="bg-muted/30 p-1 rounded-md border">
                  {/* Selected services badges */}
                  {selectedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 border-b mb-2">
                      {selectedSkills.length === services.length ? (
                        <Badge variant="secondary">All Services</Badge>
                      ) : (
                        services
                          .filter((service) =>
                            selectedSkills.includes(service.id)
                          )
                          .map((service) => (
                            <Badge
                              key={service.id}
                              variant="secondary"
                              className="pl-2 pr-1 py-1"
                            >
                              {service.name}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 ml-1 hover:bg-transparent"
                                onClick={() =>
                                  handleServiceSelect(service.id, false)
                                }
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))
                      )}
                    </div>
                  )}
                  {/* Service list */}
                  <div
                    className={`${
                      isMobile ? "min-h-[150px] max-h-[430px]" : "max-h-[300px]"
                    } overflow-y-auto overflow-x-hidden`}
                  >
                    {filteredServices.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        No services match your search
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {/* Select All checkbox at the top */}
                        <label className="grid grid-cols-[auto_1fr] items-center gap-2 px-3 py-2 rounded-sm hover:bg-muted/70 cursor-pointer bg-muted/30 border-b mb-1">
                          <Checkbox
                            id="select-all"
                            checked={
                              selectedSkills.length === services.length &&
                              services.length > 0
                            }
                            onCheckedChange={(checked) =>
                              handleServiceSelect("all", checked === true)
                            }
                          />
                          <span className="font-medium">
                            Select All Services
                          </span>
                        </label>{" "}
                        <div className="grid grid-cols-[auto_1fr] px-3 py-1.5 text-xs uppercase text-muted-foreground font-medium">
                          <div></div>
                          <div>Name</div>
                        </div>
                        {filteredServices.map((service) => (
                          <label
                            key={service.id}
                            htmlFor={service.id}
                            className={`grid grid-cols-[auto_1fr] items-center gap-2 px-3 py-2 rounded-sm hover:bg-muted/50 cursor-pointer ${
                              selectedSkills.includes(service.id)
                                ? "bg-muted/50"
                                : ""
                            }`}
                          >
                            <Checkbox
                              id={service.id}
                              checked={selectedSkills.includes(service.id)}
                              onCheckedChange={(checked) =>
                                handleServiceSelect(
                                  service.id,
                                  checked === true
                                )
                              }
                            />
                            <span>{service.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
