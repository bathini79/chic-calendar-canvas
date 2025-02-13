
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
  const [isLoading, setIsLoading] = useState(false);

  const { create, update } = useSupabaseCrud("suppliers");

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      try {
        const { data: items, error } = await supabase
          .from('inventory_items')
          .select('id, name')
          .eq('status', 'active')
          .order('name');
          
        if (error) throw error;
        console.log('Fetched items:', items); // Debug log
        setAvailableItems(items || []);
      } catch (error: any) {
        console.error('Error fetching items:', error);
        toast.error('Failed to load items');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchSupplierItems = async () => {
      if (supplier) {
        try {
          const { data: supplierItems, error } = await supabase
            .from('supplier_items')
            .select('item_id')
            .eq('supplier_id', supplier.id);
            
          if (error) throw error;
          console.log('Fetched supplier items:', supplierItems); // Debug log
          setSelectedItems((supplierItems || []).map(si => si.item_id));
        } catch (error: any) {
          console.error('Error fetching supplier items:', error);
          toast.error('Failed to load supplier items');
        }
      }
    };

    if (open) {
      fetchItems();
      if (supplier) {
        fetchSupplierItems();
      }
    }
  }, [supplier, open]);

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
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="phone" className="text-sm font-medium">Phone</label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="address" className="text-sm font-medium">Address</label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Items</label>
            <MultiSelect
              options={availableItems.map(item => ({
                label: item.name,
                value: item.id
              }))}
              selected={selectedItems}
              onChange={setSelectedItems}
              placeholder={isLoading ? "Loading items..." : "Select items..."}
              className="w-full"
            />
            {availableItems.length === 0 && !isLoading && (
              <p className="text-sm text-muted-foreground mt-1">
                No items available. Add items in the Items tab first.
              </p>
            )}
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit">
              {supplier ? 'Update Supplier' : 'Create Supplier'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
