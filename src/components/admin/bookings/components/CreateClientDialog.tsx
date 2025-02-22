
import React from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { Customer } from "@/pages/admin/bookings/types";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const createClientSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone_number: z.string().optional(),
});

type CreateClientFormData = z.infer<typeof createClientSchema>;

interface CreateClientDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
}

export const CreateClientDialog: React.FC<CreateClientDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { create } = useSupabaseCrud('profiles');
  
  const form = useForm<CreateClientFormData>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone_number: "",
    },
  });

  const onSubmit = async (data: CreateClientFormData) => {
    try {
      const newCustomer = await create({
        ...data,
        role: 'customer',
      });
      
      toast.success("Client created successfully");
      onSuccess(newCustomer as Customer);
      form.reset();
      onClose();
    } catch (error) {
      console.error("Error creating client:", error);
      toast.error("Failed to create client");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 (555) 000-0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Create Client</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
