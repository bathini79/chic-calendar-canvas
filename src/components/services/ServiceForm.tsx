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
import { CategoryMultiSelect } from "@/components/categories/CategoryMultiSelect";
import { useState } from "react";
import { Image, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  categories: z.array(z.string()).min(1, "At least one category is required"),
  original_price: z.number().min(0, "Price must be greater than or equal to 0"),
  selling_price: z.number().min(0, "Price must be greater than or equal to 0"),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  description: z.string().optional(),
  image_urls: z.array(z.string()).optional(),
  gender: z.enum(['all', 'male', 'female']).default('all'),
  locations: z.array(z.string()).min(1, "At least one location is required"),
});

type ServiceFormData = z.infer<typeof formSchema>;

interface ServiceFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ServiceForm({ initialData, onSuccess, onCancel }: ServiceFormProps) {
  const queryClient = useQueryClient();
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialData?.categories?.map((cat: any) => cat.id) || []
  );
  const [selectedLocations, setSelectedLocations] = useState<string[]>(
    initialData?.service_locations?.map((sl: any) => sl.location_id) || []
  );
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>(initialData?.image_urls || []);
  const [loading, setLoading] = useState(false);

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      categories: selectedCategories,
      original_price: initialData?.original_price || 0,
      selling_price: initialData?.selling_price || 0,
      duration: initialData?.duration || 0,
      description: initialData?.description || '',
      image_urls: images,
      gender: initialData?.gender || 'all',
      locations: selectedLocations,
    },
  });

  // Fetch locations
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  const handleCategorySelect = (categoryId: string) => {
    const newCategories = [...selectedCategories, categoryId];
    setSelectedCategories(newCategories);
    form.setValue('categories', newCategories);
  };

  const handleCategoryRemove = (categoryId: string) => {
    const newCategories = selectedCategories.filter(id => id !== categoryId);
    setSelectedCategories(newCategories);
    form.setValue('categories', newCategories);
  };

  const handleLocationChange = (locationId: string) => {
    setSelectedLocations(prev => {
      const updated = prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId];
        
      form.setValue('locations', updated);
      return updated;
    });
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
          .from('services')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('services')
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

  const onSubmit = async (data: ServiceFormData) => {
    setLoading(true);
    try {
      if (initialData?.id) {
        // Update existing service
        const { error: serviceError } = await supabase
          .from('services')
          .update({
            name: data.name,
            original_price: data.original_price,
            selling_price: data.selling_price,
            duration: data.duration,
            description: data.description,
            image_urls: data.image_urls,
            gender: data.gender,
          })
          .eq('id', initialData.id);

        if (serviceError) throw serviceError;

        // Instead of deleting and reinserting, use a transaction approach to handle categories
        const existingCategoriesRes = await supabase
          .from('services_categories')
          .select('category_id')
          .eq('service_id', initialData.id);
          
        const existingCategoriesIds = existingCategoriesRes.data?.map(c => c.category_id) || [];
        
        // Categories to add (new ones that don't exist yet)
        const categoriesToAdd = data.categories
          .filter(catId => !existingCategoriesIds.includes(catId))
          .map(categoryId => ({
            service_id: initialData.id,
            category_id: categoryId,
          }));
          
        // Categories to remove (ones that exist but aren't in the new selection)
        const categoriesToRemove = existingCategoriesIds
          .filter(catId => !data.categories.includes(catId));
          
        // Add new categories
        if (categoriesToAdd.length > 0) {
          const { error: addCategoriesError } = await supabase
            .from('services_categories')
            .insert(categoriesToAdd);
            
          if (addCategoriesError) throw addCategoriesError;
        }
        
        // Remove deselected categories
        if (categoriesToRemove.length > 0) {
          const { error: removeCategoriesError } = await supabase
            .from('services_categories')
            .delete()
            .eq('service_id', initialData.id)
            .in('category_id', categoriesToRemove);
            
          if (removeCategoriesError) throw removeCategoriesError;
        }

        // Handle service locations
        // First delete existing location relationships
        const { error: deleteLocationsError } = await supabase
          .from('service_locations')
          .delete()
          .eq('service_id', initialData.id);

        if (deleteLocationsError) throw deleteLocationsError;

        // Insert new location relationships
        const { error: locationsError } = await supabase
          .from('service_locations')
          .insert(
            data.locations.map(locationId => ({
              service_id: initialData.id,
              location_id: locationId,
            }))
          );

        if (locationsError) throw locationsError;

      } else {
        // Create new service
        const { data: newService, error: serviceError } = await supabase
          .from('services')
          .insert({
            name: data.name,
            original_price: data.original_price,
            selling_price: data.selling_price,
            duration: data.duration,
            description: data.description,
            image_urls: data.image_urls,
            gender: data.gender,
          })
          .select()
          .single();

        if (serviceError) throw serviceError;

        // Insert category relationships
        const { error: categoriesError } = await supabase
          .from('services_categories')
          .insert(
            data.categories.map(categoryId => ({
              service_id: newService.id,
              category_id: categoryId,
            }))
          );

        if (categoriesError) throw categoriesError;

        // Insert service location relationships
        const { error: locationsError } = await supabase
          .from('service_locations')
          .insert(
            data.locations.map(locationId => ({
              service_id: newService.id,
              location_id: locationId,
            }))
          );

        if (locationsError) throw locationsError;
      }

      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success(`Service ${initialData ? 'updated' : 'created'} successfully`);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Name *</FormLabel>
              <FormControl>
                <Input {...field} />
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

        <FormField
          control={form.control}
          name="locations"
          render={() => (
            <FormItem>
              <FormLabel>Locations *</FormLabel>
              <FormControl>
                <div className="border border-input rounded-md p-4 space-y-2">
                  {locations?.length ? (
                    locations.map((location) => (
                      <div key={location.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`location-${location.id}`}
                          checked={selectedLocations.includes(location.id)}
                          onCheckedChange={() => handleLocationChange(location.id)}
                        />
                        <Label 
                          htmlFor={`location-${location.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {location.name}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground text-sm">No locations available</div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="original_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Original Price (₹) *</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="selling_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selling Price (₹) *</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (minutes) *</FormLabel>
              <FormControl>
                <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
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
                          alt={`Service image ${index + 1}`}
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
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Update Service' : 'Create Service'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
