
import { useState } from "react";
import { toast } from "sonner";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import type { SupplierFormValues } from "../schemas/supplier-schema";

export function useSupplierForm(supplier?: any, onClose?: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { create, update } = useSupabaseCrud("suppliers");

  const handleSubmit = async (values: SupplierFormValues) => {
    setIsSubmitting(true);
    try {
      if (supplier) {
        await update(supplier.id, {
          name: values.name,
          contact_name: values.contact_name,
          email: values.email,
          phone: values.phone,
          address: values.address,
        });
      } else {
        await create({
          name: values.name,
          contact_name: values.contact_name,
          email: values.email,
          phone: values.phone,
          address: values.address,
        });
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
