import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ServiceMultiSelect } from "./ServiceMultiSelect";
import { useState } from "react";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
  name: z.string().min(1, "Package name is required"),
  services: z.array(z.string()).min(1, "At least one service is required"),
  price: z.number().min(0, "Price must be greater than or equal to 0"),
  description: z.string().optional(),
});

type PackageFormData = z.infer<typeof formSchema>;

interface PackageFormProps {
  initialData?: any;
  onSubmit: (data: PackageFormData) => void;
  onCancel: () => void;
}

export function PackageForm({ initialData, onSubmit, onCancel }: PackageFormProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>(
    initialData?.services?.map((service: any) => service.id) || []
  );

  const form = useForm<PackageFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      services: selectedServices,
      price: initialData?.price || 0,
      description: initialData?.description || '',
    },
  });

  const handleServiceSelect = (serviceId: string) => {
    const newServices = [...selectedServices, serviceId];
    setSelectedServices(newServices);
    form.setValue('services', newServices);
  };

  const handleServiceRemove = (serviceId: string) => {
    const newServices = selectedServices.filter(id => id !== serviceId);
    setSelectedServices(newServices);
    form.setValue('services', newServices);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Package Name *</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="services"
          render={() => (
            <FormItem>
              <FormLabel>Services *</FormLabel>
              <FormControl>
                <ServiceMultiSelect
                  selectedServices={selectedServices}
                  onServiceSelect={handleServiceSelect}
                  onServiceRemove={handleServiceRemove}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price (₹) *</FormLabel>
              <FormControl>
                <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {initialData ? 'Update Package' : 'Create Package'}
          </Button>
        </div>
      </form>
    </Form>
  );
}