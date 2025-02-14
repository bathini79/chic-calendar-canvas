
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import type { SupplierFormValues } from "../schemas/supplier-schema";

export function useSupplierForm(supplier?: any, onClose?: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { create, update } = useSupabaseCrud("suppliers");

  const handleSubmit = async (values: SupplierFormValues) => {
    setIsSubmitting(true);
    try {
      let supplierId;
      
      if (supplier) {
        const updatedSupplier = await update(supplier.id, {
          name: values.name,
          contact_name: values.contact_name,
          email: values.email,
          phone: values.phone,
          address: values.address,
        });
        supplierId = supplier.id;
      } else {
        const newSupplier = await create({
          name: values.name,
          contact_name: values.contact_name,
          email: values.email,
          phone: values.phone,
          address: values.address,
        });
        supplierId = newSupplier.id;
      }

      if (supplierId) {
        await supabase
          .from('supplier_items')
          .delete()
          .eq('supplier_id', supplierId);

        if (values.items.length > 0) {
          const supplierItems = values.items.map(itemId => ({
            supplier_id: supplierId,
            item_id: itemId,
          }));

          const { error } = await supabase
            .from('supplier_items')
            .insert(supplierItems);

          if (error) throw error;
        }
      }

      toast.success(supplier ? 'Supplier updated' : 'Supplier created');
      if (onClose) onClose();
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    handleSubmit,
  };
}
