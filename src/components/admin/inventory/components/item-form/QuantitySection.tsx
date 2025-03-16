
import { Input } from "@/components/ui/input";

interface QuantitySectionProps {
  register: any;
  index: number;
}

export function QuantitySection({ register, index }: QuantitySectionProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <label htmlFor={`quantity-${index}`} className="text-sm font-medium">Quantity</label>
        <Input
          id={`quantity-${index}`}
          type="number"
          min="0"
          {...register(`locationItems.${index}.quantity`, { valueAsNumber: true })}
        />
      </div>
      <div>
        <label htmlFor={`minimumQuantity-${index}`} className="text-sm font-medium">Minimum Quantity</label>
        <Input
          id={`minimumQuantity-${index}`}
          type="number"
          min="0"
          {...register(`locationItems.${index}.minimum_quantity`, { valueAsNumber: true })}
        />
      </div>
      <div>
        <label htmlFor={`maxQuantity-${index}`} className="text-sm font-medium">Maximum Quantity</label>
        <Input
          id={`maxQuantity-${index}`}
          type="number"
          min="0"
          {...register(`locationItems.${index}.max_quantity`, { valueAsNumber: true })}
        />
      </div>
    </div>
  );
}
