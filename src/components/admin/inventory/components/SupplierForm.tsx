
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supplierSchema, type SupplierFormValues } from "../schemas/supplier-schema";

interface SupplierFormProps {
  defaultValues: SupplierFormValues;
  supplierId?: string;
  onSubmit: (values: SupplierFormValues) => Promise<void>;
}

export function SupplierForm({ defaultValues, supplierId, onSubmit }: SupplierFormProps) {
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues,
  });

  const handleSubmit = async (data: SupplierFormValues) => {
    try {
      await onSubmit(data);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name" className="text-sm font-medium">Name</label>
        <Input
          id="name"
          {...form.register("name")}
          required
        />
      </div>
      <div>
        <label htmlFor="contactName" className="text-sm font-medium">Contact Name</label>
        <Input
          id="contactName"
          {...form.register("contact_name")}
        />
      </div>
      <div>
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <Input
          id="email"
          type="email"
          {...form.register("email")}
        />
      </div>
      <div>
        <label htmlFor="phone" className="text-sm font-medium">Phone</label>
        <Input
          id="phone"
          {...form.register("phone")}
        />
      </div>
      <div>
        <label htmlFor="address" className="text-sm font-medium">Address</label>
        <Textarea
          id="address"
          {...form.register("address")}
        />
      </div>
      <div className="flex justify-end pt-4">
        <Button type="submit">
          {supplierId ? 'Update Supplier' : 'Create Supplier'}
        </Button>
      </div>
    </form>
  );
}
