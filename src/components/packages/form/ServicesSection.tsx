import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { ServiceMultiSelect } from "../ServiceMultiSelect";
import { useFormContext } from "react-hook-form";
import { useState, useEffect } from "react";

interface ServicesSectionProps {
  selectedServices: string[];
  onServiceSelect: (serviceId: string) => void;
  onServiceRemove: (serviceId: string) => void;
}

export function ServicesSection({ 
  selectedServices, 
  onServiceSelect, 
  onServiceRemove 
}: ServicesSectionProps) {
  const form = useFormContext();
  const [hasLocationError, setHasLocationError] = useState(false);

  // This function will be called by the ServiceMultiSelect when location validation happens
  const handleLocationValidationChange = (hasError: boolean) => {
    setHasLocationError(hasError);
    
    // If there's a location error, set a custom form error
    if (hasError) {
      form.setError("services", {
        type: "manual",
        message: "Services must belong to the same location"
      });
    } else {
      // Clear the error if it was previously set
      form.clearErrors("services");
    }
  };

  return (
    <FormField
      control={form.control}
      name="services"
      render={() => (
        <FormItem>
          <FormLabel>Services *</FormLabel>
          <FormControl>
            <ServiceMultiSelect
              selectedServices={selectedServices}
              onServiceSelect={onServiceSelect}
              onServiceRemove={onServiceRemove}
              onLocationValidation={handleLocationValidationChange}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}