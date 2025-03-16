
import { Input } from "@/components/ui/input";
import { Control } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ItemFormValues } from "../../schemas/item-schema";

interface QuantitySectionProps {
  register: any;
  control: Control<ItemFormValues>;
}

export function QuantitySection({ control }: QuantitySectionProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <FormField
        control={control}
        name="quantity"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Quantity</FormLabel>
            <FormControl>
              <Input
                type="number"
                min="0"
                {...field}
                onChange={e => field.onChange(parseFloat(e.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={control}
        name="minimum_quantity"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Minimum Quantity</FormLabel>
            <FormControl>
              <Input
                type="number"
                min="0"
                {...field}
                onChange={e => field.onChange(parseFloat(e.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={control}
        name="max_quantity"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Maximum Quantity</FormLabel>
            <FormControl>
              <Input
                type="number"
                min="0"
                {...field}
                onChange={e => field.onChange(parseFloat(e.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
