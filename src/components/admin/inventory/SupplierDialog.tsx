
import { useState, useEffect } from "react";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SupplierDialogProps {
  supplier?: any;
  onClose?: () => void;
}

export function SupplierDialog({ supplier, onClose }: SupplierDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(supplier?.name || "");
  const [contactName, setContactName] = useState(supplier?.contact_name || "");
  const [email, setEmail] = useState(supplier?.email || "");
  const [phone, setPhone] = useState(supplier?.phone || "");
  const [address, setAddress] = useState(supplier?.address || "");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [availableItems, setAvailableItems] = useState<any[]>([]);

  const { create, update } = useSupabaseCrud("suppliers");

  useEffect(() => {
    const fetchItems = async () => {
      const { data: items } = await supabase
        .from('inventory_items')
        .select('id, name');
      setAvailableItems(items || []);
    };

    const fetchSupplierItems = async () => {
      if (supplier) {
        const { data: supplierItems } = await supabase
          .from('supplier_items')
          .select('item_id')
          .eq('supplier_id', supplier.id);
        setSelectedItems((supplierItems || []).map(si => si.item_id));
      }
    };

    fetchItems();
    if (supplier) {
      fetchSupplierItems();
    }
  }, [supplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let supplierId;
      if (supplier) {
        const updatedSupplier = await update(supplier.id, {
          name,
          contact_name: contactName,
          email,
          phone,
          address,
        });
        supplierId = supplier.id;
      } else {
        const newSupplier = await create({
          name,
          contact_name: contactName,
          email,
          phone,
          address,
        });
        supplierId = newSupplier.id;
      }

      // Handle supplier items
      if (supplierId) {
        // Delete existing relationships
        await supabase
          .from('supplier_items')
          .delete()
          .eq('supplier_id', supplierId);

        // Insert new relationships
        if (selectedItems.length > 0) {
          const supplierItems = selectedItems.map(itemId => ({
            supplier_id: supplierId,
            item_id: itemId,
          }));

          const { error } = await supabase
            .from('supplier_items')
            .insert(supplierItems);

          if (error) throw error;
        }
      }

      setOpen(false);
      if (onClose) onClose();
      toast.success(supplier ? 'Supplier updated' : 'Supplier created');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="text-sm font-medium">Name</label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="contactName" className="text-sm font-medium">Contact Name</label>
            <Input
              id="contactName"
              value={contactName}
              onChange