
import { Input } from "@/components/ui/input";

interface QuantitySectionProps {
  register: any;
}

export function QuantitySection({ register }: QuantitySectionProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <label htmlFor="quantity" className="text-sm font-medium">Quantity</label>
        <Input
          id="quantity"
          type="number"
          min="0"
          {...register("quantity", { valueAsNumber: true })}
        />
      </div>
      <div>
        <label htmlFor="minimumQuantity" className="text-sm font-medium">Minimum Quantity</label>
        <Input
          id="minimumQuantity"
          type="number"
          min="0"
          {...register("minimum_quantity", { valueAsNumber: true })}
        />
      </div>
      <div>
        <label htmlFor="maxQuantity" className="text-sm font-medium">Maximum Quantity</label>
        <Input
          id="maxQuantity"
          type="number"
          min="0"
          {...register("max_quantity", { valueAsNumber: true })}
        />
      </div>
    </div>
  );
}
