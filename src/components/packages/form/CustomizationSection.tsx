import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { ServiceMultiSelect } from "../ServiceMultiSelect";
import { useFormContext } from "react-hook-form";

interface CustomizationSectionProps {
  customizableServices: string[];
  onCustomizableServiceSelect: (serviceId: string) => void;
  onCustomizableServiceRemove: (serviceId: string) => void;
}

export function CustomizationSection({
  customizableServices,
  onCustomizableServiceSelect,
  onCustomizableServiceRemove,
}: CustomizationSectionProps) {
  const form = useFormContext();

  return (
    <>
      <FormField
        control={form.control}
        name="is_customizable"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel>Allow Customization</FormLabel>
              <div className="text-sm text-muted-foreground">
                Customers can add/remove optional services
              </div>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {form.watch('is_customizable') && (
        <FormField
          control={form.control}
          name="customizable_services"
          render={() => (
            <FormItem>
              <FormLabel>Customizable Services</FormLabel>
              <FormControl>
                <ServiceMultiSelect
                  selectedServices={customizableServices}
                  onServiceSelect={onCustomizableServiceSelect}
                  onServiceRemove={onCustomizableServiceRemove}
                />
              </FormControl>
              <div className="text-sm text-muted-foreground">
                Select services that customers can add to this package
              </div>
            </FormItem>
          )}
        />
      )}
    </>
  );
}