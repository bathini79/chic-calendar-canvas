
import { useState } from "react";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PurchaseOrderFormValues } from "../schemas/purchase-order-schema";
import { format } from "date-fns";

export function usePurchaseOrderForm(purchaseOrder?: any, onClose?: () => void) {
  const [open, setOpen] = useState(false);
  const { create, update } = useSupabaseCrud("purchase_orders");

  const defaultValues: PurchaseOrderFormValues = {
    supplier_id: purchaseOrder?.supplier_id || "",
    invoice_number: purchaseOrder?.invoice_number || "",
    order_date: purchaseOrder?.order_date ? new Date(purchaseOrder.order_date) : new Date(),
    tax_inclusive: purchaseOrder?.tax_inclusive || false,
    notes: purchaseOrder?.notes || "",
    items: purchaseOrder?.items || [],
  };

  const handleSubmit = async (values: PurchaseOrderFormValues) => {
    try {
      const orderData = {
        supplier_id: values.supplier_id,
        invoice_number: values.invoice_number,
        order_date: format(values.order_date, 'yyyy-MM-dd'),
        tax_inclusive: values.tax_inclusive,
        notes: values.notes,
        status: 'pending',
      };

      let savedOrder;
      if (purchaseOrder) {
        savedOrder = await update(purchaseOrder.id, orderData);
      } else {
        savedOrder = await create(orderData);
      }

      if (savedOrder && values.items.length > 0) {
        if (purchaseOrder) {
          await supabase
            .from('purchase_order_items')
            .delete()
            .eq('purchase_order_id', savedOrder.id);
        }

        const purchaseOrderItems = values.items.map(item => ({
          purchase_order_id: savedOrder.id,
          item_id: item.item_id,
          quantity: item.quantity,
          purchase_price: item.purchase_price,
          tax_rate: item.tax_rate,
          expiry_date: item.expiry_date ? format(item.expiry_date, 'yyyy-MM-dd') : null,
        }));

        const { error } = await supabase
          .from('purchase_order_items')
          .insert(purchaseOrderItems);

        if (error) {
          toast.error("Error saving purchase order items");
          return;
        }
      }

      toast.success(purchaseOrder ? "Purchase order updated" : "Purchase order created");
      setOpen(false);
      if (onClose) onClose();
    } catch (error) {
      toast.error("Error saving purchase order");
      console.error("Error saving purchase order:", error);
    }
  };

  return {
    open,
    setOpen,
    defaultValues,
    handleSubmit,
  };
}
