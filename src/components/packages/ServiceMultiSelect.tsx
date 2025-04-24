import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ServiceMultiSelectProps {
  selectedServices: string[];
  onServiceSelect: (serviceId: string) => void;
  onServiceRemove: (serviceId: string) => void;
  excludeServices?: string[];
  onLocationValidation?: (hasError: boolean) => void;
}

export function ServiceMultiSelect({
  selectedServices,
  onServiceSelect,
  onServiceRemove,
  excludeServices = [],
  onLocationValidation,
}: ServiceMultiSelectProps) {
  const [locationError, setLocationError] = useState<string | null>(null);
  const [serviceLocations, setServiceLocations] = useState<Record<string, string[]>>({});
  const [commonLocation, setCommonLocation] = useState<string | null>(null);

  // Fetch all services
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch service locations
  const { data: locationData } = useQuery({
    queryKey: ['service_locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_locations')
        .select('service_id, location_id');
      
      if (error) throw error;
      return data;
    },
  });
  
  // Fetch location names for better error messages
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name');
      
      if (error) throw error;
      return data;
    },
  });

  // Process location data to create a map of service_id -> location_ids
  useEffect(() => {
    if (locationData) {
      const locMap: Record<string, string[]> = {};
      
      locationData.forEach(item => {
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
    if (selectedServices.length > 1 && Object.keys(serviceLocations).length > 0) {
      const validationResult = validateServiceLocations(selectedServices);
      
      // Notify parent component about validation result
      if (onLocationValidation) {
        onLocationValidation(!!locationError);
      }
    } else {
      setLocationError(null);
      setCommonLocation(null);
      
      if (onLocationValidation) {
        onLocationValidation(false);
      }
    }
  }, [selectedServices, serviceLocations, locationError]);

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
      commonLocations = commonLocations.filter(loc => 
        currentServiceLocations.includes(loc)
      );
      
      if (commonLocations.length === 0) {
        const serviceNames = serviceIds.map(id => 
          services?.find(s => s.id === id)?.name || id
        ).join(", ");
        
        setLocationError(`The selected services (${serviceNames}) do not share a common location. Please select services from the same location only.`);
        setCommonLocation(null);
        return false;
      }
    }
    
    // If we have a common location, store it
    if (commonLocations.length > 0) {
      setCommonLocation(commonLocations[0]);
      
      // Get the location name for display
      const locationName = locations?.find(l => l.id === commonLocations[0])?.name;
      if (locationName && selectedServices.length > 1) {
        // We can show a success message here, but it's optional
        // setLocationMessage(`All selected services are available at ${locationName}`);
      }
    }
    
    setLocationError(null);
    return true;
  };

  // Check if a service can be added based on location compatibility
  const canAddService = (serviceId: string) => {
    if (selectedServices.length === 0 || Object.keys(serviceLocations).length === 0) {
      return true;
    }
    
    const currentServiceLocations = serviceLocations[serviceId] || [];
    
    // If we already have a common location from existing selections, 
    // just check if the new service is available at that location
    if (commonLocation) {
      return currentServiceLocations.includes(commonLocation);
    }
    
    // Otherwise, check if the new service shares at least one location with the already selected services
    for (const selectedId of selectedServices) {
      const selectedServiceLocations = serviceLocations[selectedId] || [];
      const hasCommonLocation = currentServiceLocations.some(loc => 
        selectedServiceLocations.includes(loc)
      );
      
      if (!hasCommonLocation) {
        return false;
      }
    }
    
    return true;
  };

  // Handle service selection with location validation
  const handleServiceSelect = (serviceId: string) => {
    if (canAddService(serviceId)) {
      onServiceSelect(serviceId);
    } else {
      const serviceName = services?.find(s => s.id === serviceId)?.name || serviceId;
      const existingServiceNames = selectedServices
        .map(id => services?.find(s => s.id === id)?.name || id)
        .join(", ");
      
      // Get location names for better error message
      const serviceLocationNames = serviceLocations[serviceId]?.map(locId => 
        locations?.find(l => l.id === locId)?.name || locId
      ).join(", ");
      
      const existingLocations = commonLocation ? 
        locations?.find(l => l.id === commonLocation)?.name || commonLocation :
        "different locations";
      
      setLocationError(`Cannot add "${serviceName}" (available at ${serviceLocationNames}) because it does not share a location with the already selected services (${existingServiceNames}) which are at ${existingLocations}.`);
    }
  };

  const availableServices = services?.filter(
    service => !selectedServices.includes(service.id) && !excludeServices.includes(service.id)
  );

  return (
    <div className="space-y-2">
      <Select onValueChange={handleServiceSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Select services" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {availableServices?.map((service) => (
              <SelectItem 
                key={service.id} 
                value={service.id}
              >
                {service.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      
      {locationError && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Location Error</AlertTitle>
          <AlertDescription>
            {locationError}
          </AlertDescription>
        </Alert>
      )}
      
      {commonLocation && selectedServices.length > 1 && (
        <Alert className="mt-2 bg-green-50 text-green-800 border-green-200">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertTitle>Common Location</AlertTitle>
          <AlertDescription>
            All selected services are available at {locations?.find(l => l.id === commonLocation)?.name || 'the same location'}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex flex-wrap gap-2">
        {services?.filter(service => selectedServices.includes(service.id)).map((service) => (
          <Badge key={service.id} variant="secondary">
            {service.name}
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 ml-1 hover:bg-transparent"
              onClick={() => onServiceRemove(service.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>
    </div>
  );
}