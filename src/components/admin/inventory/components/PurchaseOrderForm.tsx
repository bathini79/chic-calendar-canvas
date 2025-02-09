
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { PurchaseOrderFormValues, purchaseOrderSchema } from "../schemas/purchase-order-schema";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { OrderHeader } from "./purchase-order/OrderHeader";
import { OrderDetails } from "./purchase-order/OrderDetails";
import { OrderItems } from "./purchase-order/OrderItems";

interface PurchaseOrderFormProps {
  defaultValues: PurchaseOrderFormValues;
  onSubmit: (values: PurchaseOrderFormValues) => void;
}

export function PurchaseOrderForm({ defaultValues, onSubmit }: PurchaseOrderFormProps) {
  const { data: suppliers } = useSupabaseCrud("suppliers");
  const { data: items } = useSupabaseCrud("inventory_items");

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <OrderHeader form={form} suppliers={suppliers || []} />
        <OrderDetails form={form} />
        <OrderItems form={form} items={items || []} />
        
        <Button type="submit" className="w-full">
          Submit Purchase Order
        </Button>
      </form>
    </Form>
  );
}
