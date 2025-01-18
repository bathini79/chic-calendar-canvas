import { useForm, FormProvider } from "react-hook-form";
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
import { useState, useEffect } from "react";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PriceSection } from "./form/PriceSection";
import { ServicesSection } from "./form/ServicesSection";
import { ImageUploadSection } from "./form/ImageUploadSection";
import { CustomizationSection } from "./form/CustomizationSection";

const formSchema = z.object({
  name: z.string().min(1, "Package name is required"),
  services: z.array(z.string()).min(1, "At least one service is required"),
  price: z.number().min(0, "Price must be greater than or equal to 0"),
  description: z.string().optional(),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  is_customizable: z.boolean().default(false),
  status: z.enum(['active', 'inactive']).default('active'),
  discount_type: z.enum(['none', 'percentage', 'fixed']).default('none'),
  discount_value: z.number().min(0).default(0),
  image_urls: z.array(z.string()).optional(),
  customizable_services: z.array(z.string()).default([]),
});

type PackageFormData = z.infer<typeof formSchema>;

interface PackageFormProps {
  initialData?: any;
  onSubmit: (data: PackageFormData) => void;
  onCancel: () => void;
}

export function PackageForm({ initialData, onSubmit, onCancel }: PackageFormProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [customizableServices, setCustomizableServices] = useState<string[]>(
    initialData?.customizable_services || []
  );
  const [images, setImages] = useState<string[]>(initialData?.image_urls || []);
  const [calculatedPrice, setCalculatedPrice] = useState(0);

  const form = useForm<PackageFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      services: selectedServices,
      price: initialData?.price || 0,
      description: initialData?.description || '',
      duration: initialData?.duration || 0,
      is_customizable: initialData?.is_customizable || false,
      status: initialData?.status || 'active',
      discount_type: initialData?.discount_type || 'none',
      discount_value: initialData?.discount_value || 0,
      image_urls: images,
      customizable_services: customizableServices,
    },
  });

  // Fetch all services
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Initialize form with async initialData
  useEffect(() => {
    if (initialData) {
      setSelectedServices(initialData?.services || []);
      setCustomizableServices(initialData?.customizable_services || []);
      setImages(initialData?.image_urls || []);
      form.reset({
        name: initialData?.name || '',
        services: initialData?.services || [],
        price: initialData?.price || 0,
        description: initialData?.description || '',
        duration: initialData?.duration || 0,
        is_customizable: initialData?.is_customizable || false,
        status: initialData?.status || 'active',
        discount_type: initialData?.discount_type || 'none',
        discount_value: initialData?.discount_value || 0,
        image_urls: initialData?.image_urls || [],
        customizable_services: initialData?.customizable_services || [],
      });
    }
  }, [initialData, form]);

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServices([...selectedServices, serviceId]);
    form.setValue('services', [...selectedServices, serviceId]);
  };

  const handleServiceRemove = (serviceId: string) => {
    const updatedServices = selectedServices.filter(id => id !== serviceId);
    setSelectedServices(updatedServices);
    form.setValue('services', updatedServices);
  };

  const handleCustomizableServiceSelect = (serviceId: string) => {
    setCustomizableServices([...customizableServices, serviceId]);
    form.setValue('customizable_services', [...customizableServices, serviceId]);
  };

  const handleCustomizableServiceRemove = (serviceId: string) => {
    const updatedServices = customizableServices.filter(id => id !== serviceId);
    setCustomizableServices(updatedServices);
    form.setValue('customizable_services', updatedServices);
  };

  // Calculate total price based on selected services and apply discount
  useEffect(() => {
    if (services) {
      const basePrice = selectedServices.reduce((total, serviceId) => {
        const service = services.find(s => s.id === serviceId);
        return total + (service?.selling_price || 0);
      }, 0);

      const discountType = form.watch('discount_type');
      const discountValue = form.watch('discount_value') || 0;

      let finalPrice = basePrice;
      if (discountType === 'percentage') {
        finalPrice = basePrice * (1 - (discountValue / 100));
      } else if (discountType === 'fixed') {
        finalPrice = Math.max(0, basePrice - discountValue);
      }

      setCalculatedPrice(Math.max(0, finalPrice));
      form.setValue('price', Math.max(0, finalPrice));
    }
  }, [selectedServices, services, form.watch('discount_type'), form.watch('discount_value')]);

  // Calculate total duration based on selected services
  useEffect(() => {
    if (services) {
      const totalDuration = selectedServices.reduce((total, serviceId) => {
        const service = services.find(s => s.id === serviceId);
        return total + (service?.duration || 0);
      }, 0);

      form.setValue('duration', totalDuration);
    }
  }, [selectedServices, services]);

  return (
    <FormProvider {...form}>
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <ServicesSection
          selectedServices={selectedServices}
          onServiceSelect={handleServiceSelect}
          onServiceRemove={handleServiceRemove}
        />

        <PriceSection 
          calculatedPrice={calculatedPrice} 
          selectedServices={selectedServices}
          services={services || []}
        />

        <CustomizationSection
          customizableServices={customizableServices}
          selectedServices={selectedServices}
          onCustomizableServiceSelect={handleCustomizableServiceSelect}
          onCustomizableServiceRemove={handleCustomizableServiceRemove}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <FormControl>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...field}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <ImageUploadSection images={images} setImages={setImages} />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {initialData ? 'Update Package' : 'Create Package'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}