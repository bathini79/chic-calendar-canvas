import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useFormContext } from "react-hook-form";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PriceSectionProps {
  calculatedPrice: number;
  selectedServices: any[];
  services: any[];
}

export function PriceSection({ calculatedPrice, selectedServices, services }: PriceSectionProps) {
  const form = useFormContext();

  const getServicePrice = (serviceId: string) => {
    const service = services?.find(s => s.id === serviceId);
    if (!service) return 0;

    const basePrice = service.selling_price;
    const discountType = form.watch('discount_type');
    const discountValue = form.watch('discount_value') || 0;

    if (discountType === 'percentage') {
      return basePrice * (1 - (discountValue / 100));
    } else if (discountType === 'fixed') {
      // Distribute fixed discount proportionally among services
      const totalBasePrice = selectedServices.reduce((total, id) => {
        const svc = services?.find(s => s.id === id);
        return total + (svc?.selling_price || 0);
      }, 0);
      
      const discountRatio = discountValue / totalBasePrice;
      return Math.max(0, basePrice * (1 - discountRatio));
    }
    return basePrice;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="price"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Total Price (₹)</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                {...field} 
                value={calculatedPrice}
                disabled
                className="bg-muted"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="duration"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Duration (minutes)</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                {...field}
                disabled
                className="bg-muted"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="discount_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Discount Type</FormLabel>
            <FormControl>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select discount type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="discount_value"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {form.watch('discount_type') === 'percentage' ? 'Discount (%)' : 'Discount Amount (₹)'}
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                {...field}
                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                disabled={form.watch('discount_type') === 'none'}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {selectedServices.length > 0 && services && (
        <div className="col-span-2 mt-4 space-y-2">
          <p className="text-sm font-medium">Selected Services with Applied Discount:</p>
          <div className="space-y-2">
            {selectedServices.map(serviceId => {
              const service = services.find(s => s.id === serviceId);
              if (!service) return null;
              
              const discountedPrice = getServicePrice(serviceId);
              
              return (
                <div key={serviceId} className="flex justify-between items-center p-2 bg-muted rounded-lg">
                  <span>{service.name}</span>
                  <div className="text-sm space-x-2">
                    {discountedPrice !== service.selling_price && (
                      <span className="line-through text-muted-foreground">₹{service.selling_price}</span>
                    )}
                    <span>₹{discountedPrice.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}