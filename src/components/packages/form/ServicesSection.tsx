import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { ServiceMultiSelect } from "../ServiceMultiSelect";
import { useFormContext } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

  return (
    <FormField
      control={form.control}
      name="services"
      render={() => (
        <FormItem>
          <FormLabel>Services *</FormLabel>
          <FormControl>
            <div className="space-y-4">
              <ServiceMultiSelect
                selectedServices={selectedServices}
                onServiceSelect={onServiceSelect}
                onServiceRemove={onServiceRemove}
              />
              {selectedServices.length > 0 && services && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Selected Services:</p>
                  <div className="space-y-2">
                    {selectedServices.map(serviceId => {
                      const service = services.find(s => s.id === serviceId);
                      if (!service) return null;
                      
                      return (
                        <div key={serviceId} className="flex justify-between items-center p-2 bg-muted rounded-lg">
                          <span>{service.name}</span>
                          <span className="text-sm">₹{service.selling_price}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}