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
import { useState, useEffect } from "react";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Image, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

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
  const [selectedServices, setSelectedServices] = useState<string[]>(
    initialData?.services?.map((service: any) => service.id) || []
  );
  const [customizableServices, setCustomizableServices] = useState<string[]>(
    initialData?.customizable_services || []
  );
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>(initialData?.image_urls || []);
  const [calculatedPrice, setCalculatedPrice] = useState(0);

  // Fetch all services to calculate total price
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

  // Calculate total price based on selected services
  useEffect(() => {
    if (services) {
      const basePrice = selectedServices.reduce((total, serviceId) => {
        const service = services.find(s => s.id === serviceId);
        return total + (service?.selling_price || 0);
      }, 0);

      // Apply discount if any
      const discountType = form.watch('discount_type');
      const discountValue = form.watch('discount_value');
      
      let finalPrice = basePrice;
      if (discountType === 'percentage') {
        finalPrice = basePrice * (1 - (discountValue / 100));
      } else if (discountType === 'fixed') {
        finalPrice = basePrice - discountValue;
      }

      setCalculatedPrice(Math.max(0, finalPrice));
      form.setValue('price', Math.max(0, finalPrice));
    }
  }, [selectedServices, form.watch('discount_type'), form.watch('discount_value'), services]);

  // Calculate total duration
  useEffect(() => {
    if (services) {
      const totalDuration = selectedServices.reduce((total, serviceId) => {
        const service = services.find(s => s.id === serviceId);
        return total + (service?.duration || 0);
      }, 0);
      form.setValue('duration', totalDuration);
    }
  }, [selectedServices, services]);

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

  const handleCustomizableServiceSelect = (serviceId: string) => {
    const newServices = [...customizableServices, serviceId];
    setCustomizableServices(newServices);
    form.setValue('customizable_services', newServices);
  };

  const handleCustomizableServiceRemove = (serviceId: string) => {
    const newServices = customizableServices.filter(id => id !== serviceId);
    setCustomizableServices(newServices);
    form.setValue('customizable_services', newServices);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newImages = [...images];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('packages')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('packages')
          .getPublicUrl(filePath);

        newImages.push(publicUrl);
      }

      setImages(newImages);
      form.setValue('image_urls', newImages);
      toast.success('Images uploaded successfully');
    } catch (error: any) {
      toast.error('Error uploading images');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    form.setValue('image_urls', newImages);
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (₹)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    value={calculatedPrice}
                    disabled
                    className="bg-muted"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field}
                    disabled
                    className="bg-muted"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="is_customizable"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Allow Customization</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Customers can add/remove optional services
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch('is_customizable') && (
          <FormField
            control={form.control}
            name="customizable_services"
            render={() => (
              <FormItem>
                <FormLabel>Customizable Services</FormLabel>
                <FormControl>
                  <ServiceMultiSelect
                    selectedServices={customizableServices}
                    onServiceSelect={handleCustomizableServiceSelect}
                    onServiceRemove={handleCustomizableServiceRemove}
                  />
                </FormControl>
                <div className="text-sm text-muted-foreground">
                  Select services that customers can add to this package
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="discount_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Type</FormLabel>
                <FormControl>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    {...field}
                  >
                    <option value="none">None</option>
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="discount_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {form.watch('discount_type') === 'percentage' ? 'Discount (%)' : 'Discount Amount (₹)'}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={e => field.onChange(parseFloat(e.target.value))}
                    disabled={form.watch('discount_type') === 'none'}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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

        <FormField
          control={form.control}
          name="image_urls"
          render={() => (
            <FormItem>
              <FormLabel>Images</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    {images.map((url, index) => (
                      <div key={url} className="relative group">
                        <img
                          src={url}
                          alt={`Package image ${index + 1}`}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="relative"
                      disabled={uploading}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Image className="h-4 w-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Upload Images'}
                    </Button>
                  </div>
                </div>
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
