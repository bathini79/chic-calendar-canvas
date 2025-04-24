import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useFormContext } from "react-hook-form";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

interface PriceSectionProps {
  calculatedPrice: number;
  selectedServices: any[];
  services: any[];
  discountedPrice: any;
}

// Helper function to format duration from minutes to hours:minutes
const formatDuration = (totalMinutes: number): string => {
  if (totalMinutes <= 0) return '0 min';
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours === 0) {
    return `${minutes} min`;
  } else if (minutes === 0) {
    return `${hours} hr`;
  } else {
    return `${hours} hr ${minutes} min`;
  }
};

export function PriceSection({ calculatedPrice, selectedServices, services, discountedPrice }: PriceSectionProps) {
  const form = useFormContext();
  const durationMinutes = form.watch('duration') || 0;
  const formattedDuration = formatDuration(durationMinutes);
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="text-sm font-medium">Services Breakdown</div>
            <div className="space-y-2">
              {selectedServices.map(serviceId => {
                const service = services.find(s => s.id === serviceId);
                if (!service) return null;
                
                // Use the actual service selling price as base price
                const originalPrice = service.selling_price;
                // Get the stored or calculated discounted price for this service
                const displayPrice = discountedPrice?.[serviceId];
                
                return (
                  <div key={serviceId} className="flex justify-between items-center p-2 bg-background rounded-lg">
                    <span className="font-medium">{service.name}</span>
                    <div className="text-sm space-x-2">
                      {displayPrice !== originalPrice && (
                        <span className="text-muted-foreground line-through">
                          {formatPrice(originalPrice)}
                        </span>
                      )}
                      <span className="font-medium">
                        {formatPrice(displayPrice || originalPrice)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Price</span>
                <span className="font-semibold text-lg">{formatPrice(calculatedPrice)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Total Duration</span>
                <span>{formattedDuration}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <FormField
        control={form.control}
        name="duration"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Duration</FormLabel>
            <FormControl>
              <div className="relative">
                <Input 
                  type="number" 
                  {...field}
                  disabled
                  className="bg-muted"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-sm text-muted-foreground">
                  {formattedDuration}
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
