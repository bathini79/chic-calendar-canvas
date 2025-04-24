
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
  });

  const { handleSubmit } = useSupplierForm(supplier, () => {
    setOpen(false);
    if (onClose) onClose();
  });

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
