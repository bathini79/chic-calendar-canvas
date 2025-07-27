import React, { useState, useEffect, useMemo } from "react";
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
import { cn } from "@/lib/utils";

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
  description: string | null;
  duration: number;
  original_price: number;
  selling_price: number;
  category_id: string | null;
  category_name?: string;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
  image_urls: string[] | null;
  gender: string | null;
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
  const [serviceLocations, setServiceLocations] = useState<Record<string, string[]>>({});
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
  const filteredServices = useMemo(() => {
    return services.filter((service) =>
      service.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [services, searchQuery]);

  return (
    <div className={cn(
      "space-y-6",
      isMobile ? "px-4" : "pl-32 pr-8"
    )}>
      <div className={cn(
        "border rounded-lg p-6 bg-white",
        isMobile ? "max-w-full" : "max-w-[850px]"
      )}>
        <h3 className="text-lg font-semibold mb-4">Service Settings</h3>
        
        <div className="space-y-4">
          <div className="grid gap-4">
            <div className={cn(
              isMobile ? "max-w-full" : "max-w-[800px]"
            )}>
              <div className={cn(
                "flex items-center space-x-3 bg-gray-50 rounded-lg",
                isMobile ? "mb-4 p-2" : "mb-6 p-3"
              )}>
                <Search className="w-5 h-5 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                />
              </div>

              <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={cn(
                      "text-base",
                      isMobile ? "mb-2" : "mb-4"
                    )}>Services *</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        {filteredServices.map((service) => (
                          <div
                            key={service.id}
                            className={cn(
                              "flex items-start space-x-3 rounded-lg transition-colors hover:bg-gray-50 border",
                              isMobile ? "p-2" : "p-3"
                            )}
                          >
                            <Checkbox
                              checked={selectedSkills.includes(service.id)}
                              onCheckedChange={(checked: boolean) => {
                                const newSkills = checked
                                  ? [...selectedSkills, service.id]
                                  : selectedSkills.filter((id) => id !== service.id);
                                setSelectedSkills(newSkills);
                                field.onChange(newSkills);

                                // Check service locations
                                const serviceLocationsArray = serviceLocations[service.id] || [];
                                if (checked && serviceLocationsArray.length === 0) {
                                  setLocationError(
                                    `Service "${service.name}" is not available at any location.`
                                  );
                                }
                              }}
                              className={cn(
                                "h-5 w-5",
                                isMobile ? "mt-0.5" : "mt-1"
                              )}
                            />
                            <div className="flex flex-col flex-1 min-w-0">
                              <div className={cn(
                                "flex justify-between items-start",
                                isMobile ? "flex-col space-y-1" : "flex-row"
                              )}>
                                <div className="min-w-0">
                                  <label
                                    htmlFor={service.id}
                                    className={cn(
                                      "font-medium leading-none cursor-pointer block",
                                      isMobile ? "text-[14px] pr-2" : "text-[15px]"
                                    )}
                                  >
                                    {service.name}
                                  </label>
                                  {service.category_name && (
                                    <span className={cn(
                                      "block text-muted-foreground",
                                      isMobile ? "text-xs mt-0.5" : "text-sm mt-1"
                                    )}>
                                      {service.category_name}
                                    </span>
                                  )}
                                  <span className={cn(
                                    "block text-muted-foreground",
                                    isMobile ? "text-xs mt-0.5" : "text-sm mt-1"
                                  )}>
                                    Duration: {service.duration} mins
                                  </span>
                                </div>
                                <div className={cn(
                                  "text-right flex items-center",
                                  isMobile ? "w-full justify-between mt-1 pt-1 border-t" : ""
                                )}>
                                  <span className={cn(
                                    "font-medium text-primary",
                                    isMobile ? "text-sm" : "text-base"
                                  )}>
                                    ₹{service.selling_price}
                                  </span>
                                  {service.original_price !== service.selling_price && (
                                    <span className={cn(
                                      "text-muted-foreground line-through",
                                      isMobile ? "text-xs ml-2" : "text-sm block mt-1"
                                    )}>
                                      ₹{service.original_price}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {filteredServices.length === 0 && (
                          <div className={cn(
                            "text-center text-muted-foreground",
                            isMobile ? "py-6" : "py-8"
                          )}>
                            No services found matching your search
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage className="mt-2" />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      </div>

      {locationError && (
        <div className={cn(
          "border rounded-lg p-4 bg-yellow-50 border-yellow-200",
          isMobile ? "max-w-full" : "max-w-[850px]"
        )}>
          <p className="text-sm text-yellow-800">{locationError}</p>
        </div>
      )}
    </div>
  );
}
