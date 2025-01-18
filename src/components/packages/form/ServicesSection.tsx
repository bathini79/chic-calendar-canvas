import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { ServiceMultiSelect } from "../ServiceMultiSelect";
import { useFormContext } from "react-hook-form";

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
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}