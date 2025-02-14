
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SupplierForm } from "./components/SupplierForm";
import { useSupplierForm } from "./hooks/use-supplier-form";
import type { SupplierFormValues } from "./schemas/supplier-schema";

interface SupplierDialogProps {
  supplier?: any;
  onClose?: () => void;
}

export function SupplierDialog({ supplier, onClose }: SupplierDialogProps) {
  const [open, setOpen] = useState(false);
  const [defaultValues, setDefaultValues] = useState<SupplierFormValues>({
    name: supplier?.name || "",
    contact_name: supplier?.contact_name || "",
    email: supplier?.email || "",
    phone: supplier?.phone || "",
    address: supplier?.address || "",
    items: [],
  });

  const { handleSubmit } = useSupplierForm(supplier, () => {
    setOpen(false);
    if (onClose) onClose();
  });

  useEffect(() => {
    const fetchSupplierItems = async () => {
      if (supplier) {
        try {
          const { data: supplierItems, error } = await supabase
            .from('supplier_items')
            .select('item_id')
            .eq('supplier_id', supplier.id);
            
          if (error) throw error;
          setDefaultValues(prev => ({
            ...prev,
            items: (supplierItems || []).map(si => si.item_id)
          }));
        } catch (error: any) {
          console.error('Error fetching supplier items:', error);
        }
      }
    };

    if (open && supplier) {
      fetchSupplierItems();
    }
  }, [supplier, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {supplier ? 'Edit Supplier' : 'Add Supplier'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
        </DialogHeader>
        <SupplierForm
          defaultValues={defaultValues}
          supplierId={supplier?.id}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
