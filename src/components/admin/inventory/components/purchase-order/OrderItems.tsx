
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { PurchaseOrderFormValues } from "../../schemas/purchase-order-schema";
import { OrderItem } from "./OrderItem";
import { useFieldArray } from "react-hook-form";

interface OrderItemsProps {
  form: UseFormReturn<PurchaseOrderFormValues>;
  items: any[];
}

export function OrderItems({ form, items }: OrderItemsProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const handleAddItem = () => {
    append({
      item_id: "",
      quantity: 1,
      purchase_price: 0,
      tax_rate: 0,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Items</h3>
        <Button type="button" onClick={handleAddItem} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <OrderItem
            key={field.id}
            form={form}
            index={index}
            onRemove={() => remove(index)}
            items={items}
          />
        ))}
      </div>
    </div>
  );
}
