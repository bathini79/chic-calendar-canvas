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
import { CategoryMultiSelect } from "../categories/CategoryMultiSelect";

const formSchema = z.object({
  name: z.string().min(1, "Package name is required"),
  services: z.array(z.string()).min(1, "At least one service is required"),
  categories: z.array(z.string()).min(1, "At least one category is required"),
  price: z.number().min(0, "Price must be greater than or equal to 0"),
  description: z.string().optional(),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  is_customizable: z.boolean().default(false),
  status: z.enum(['active', 'inactive']).default('active'),
  discount_type: z.enum(['none', 'percentage', 'fixed']).default('none'),
  discount_value: z.number().min(0).default(0),
  image_urls: z.array(z.string()).optional(),
  customizable_services: z.array(z.string()).default([]),  selling_price: z.record(z.string(), z.number()).default({}), // Dynamic service prices
});

type PackageFormData = z.infer<typeof formSchema>;

interface PackageFormProps {
  initialData?: any;
  onSubmit: (data: PackageFormData) => void;
  onCancel: () => void;
}

export function PackageForm({ initialData, onSubmit, onCancel }: PackageFormProps) {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialData?.package_categories?.map((pc: any) => pc.categories.id) || []
  );
  const [customizableServices, setCustomizableServices] = useState<string[]>(
    initialData?.customizable_services || []
  );
  const [images, setImages] = useState<string[]>(initialData?.image_urls || []);
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [discountedPrice, setDiscountedPrice] = useState(initialData?.selling_price || {});
  const [hasLocationError, setHasLocationError] = useState(false);

  const form = useForm<PackageFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      services: selectedServices,
      categories: selectedCategories,
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
      setSelectedCategories(initialData?.package_categories?.map((pc: any) => pc.categories.id) || []);
      setCustomizableServices(initialData?.customizable_services || []);
      setImages(initialData?.image_urls || []);
      setDiscountedPrice(initialData?.selling_price || {});
      
      form.reset({
        name: initialData?.name || '',
        services: initialData?.services || [],
        categories: initialData?.package_categories?.map((pc: any) => pc.categories.id) || [],
        price: initialData?.price || 0,
        description: initialData?.description || '',
        duration: initialData?.duration || 0,
        is_customizable: initialData?.is_customizable || false,
        status: initialData?.status || 'active',
        discount_type: initialData?.discount_type || 'none',
        discount_value: initialData?.discount_value || 0,
        image_urls: initialData?.image_urls || [],
        customizable_services: initialData?.customizable_services || [],
        selling_price: initialData?.selling_price || {},
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

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategories([...selectedCategories, categoryId]);
    form.setValue('categories', [...selectedCategories, categoryId]);
  };

  const handleCategoryRemove = (categoryId: string) => {
    const updatedCategories = selectedCategories.filter(id => id !== categoryId);
    setSelectedCategories(updatedCategories);
    form.setValue('categories', updatedCategories);
  };

  const calculateDiscountedPrice = (basePrice, discountType, discountValue, totalBasePrice = basePrice) => {
    if (discountType === 'percentage') {
      return basePrice * (1 - discountValue / 100);
    } else if (discountType === 'fixed' && totalBasePrice > 0) {
      return Math.max(0, basePrice - (discountValue * (basePrice / totalBasePrice)));
    }
    return basePrice;
  };
  
  const getTotalBasePrice = () =>
    selectedServices.reduce((total, id) => total + (services?.find((s) => s.id === id)?.selling_price || 0), 0);
  
  const getServicePrice = (serviceId) => {
    const service = services?.find((s) => s.id === serviceId);
    if (!service) return 0;
  
    const discountType = form.watch('discount_type');
    const discountValue = form.watch('discount_value') || 0;
    const totalBasePrice = getTotalBasePrice();
    const finalPrice = calculateDiscountedPrice(service.selling_price, discountType, discountValue, totalBasePrice);
    setDiscountedPrice((prev) => ({ ...prev, [serviceId]: finalPrice }));
    form.setValue(`selling_price.${serviceId}`, finalPrice);
  };
  
  useEffect(() => {
    if (!services) return;
  
    const basePrice = getTotalBasePrice();
    selectedServices.forEach(getServicePrice);
  
    const discountType = form.watch('discount_type');
    const discountValue = form.watch('discount_value') || 0;
    const finalPrice = calculateDiscountedPrice(basePrice, discountType, discountValue);
  
    setCalculatedPrice(finalPrice);
    form.setValue('price', finalPrice);
  }, [selectedServices, services, form.watch('discount_type'), form.watch('discount_value')]);
  
  const handleLocationValidationChange = (hasError: boolean) => {
    setHasLocationError(hasError);
  };

  const handleFormSubmit = (data: PackageFormData) => {
    // Only allow submission if there's no location error
    if (!hasLocationError) {
      // Ensure duration is correctly calculated before submission
      if (services) {
        const totalDuration = selectedServices.reduce((total, serviceId) => {
          const service = services.find(s => s.id === serviceId);
          return total + (service?.duration || 0);
        }, 0);
        
        // Update duration in the form data before submission
        data.duration = totalDuration;
      }
      
      onSubmit(data);
    } else {
      // If there's a location error, prevent submission and show an error
      form.setError("services", {
        type: "manual",
        message: "Cannot create package with services from different locations"
      });
    }
  };

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
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
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

        <FormField
          control={form.control}
          name="categories"
          render={() => (
            <FormItem>
              <FormLabel>Categories *</FormLabel>
              <FormControl>
                <CategoryMultiSelect
                  selectedCategories={selectedCategories}
                  onCategorySelect={handleCategorySelect}
                  onCategoryRemove={handleCategoryRemove}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <ServicesSection
          selectedServices={selectedServices}
          onServiceSelect={handleServiceSelect}
          onServiceRemove={handleServiceRemove}
          onLocationValidation={handleLocationValidationChange}
        />

        <PriceSection 
          calculatedPrice={calculatedPrice} 
          selectedServices={selectedServices}
          services={services || []}
          discountedPrice={discountedPrice}
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
          <Button type="submit" disabled={hasLocationError}>
            {initialData ? 'Update Package' : 'Create Package'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
