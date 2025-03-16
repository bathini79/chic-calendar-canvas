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
import { ServiceMultiSelect } from "@/components/packages/ServiceMultiSelect";
import { ImageUploadSection } from "@/components/packages/form/ImageUploadSection";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  photo_url: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  employment_type: z.enum(['stylist', 'operations']).default('stylist'),
  skills: z.array(z.string()).min(1, "At least one skill is required"),
  locations: z.array(z.string()).min(1, "At least one location is required"),
});

type StaffFormData = z.infer<typeof formSchema>;

interface StaffFormProps {
  initialData?: any;
  onSubmit: (data: StaffFormData) => void;
  onCancel: () => void;
  employeeId?: string;
}

export function StaffForm({ initialData, onSubmit, onCancel, employeeId }: StaffFormProps) {
  const [images, setImages] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<StaffFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      photo_url: '',
      status: 'active',
      employment_type: 'stylist',
      skills: [],
      locations: [],
    },
  });

  // Fetch locations
  const { data: locations } = useQuery({
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

  // Initialize form with employee data when it's loaded
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        photo_url: initialData.photo_url || '',
        status: initialData.status || 'active',
        employment_type: initialData.employment_type || 'stylist',
        skills: initialData.employee_skills?.map((s: any) => s.service_id) || [],
        locations: initialData.employee_locations?.map((l: any) => l.location_id) || [],
      });
      
      if (initialData.photo_url) {
        setImages([initialData.photo_url]);
      }
      
      setSelectedSkills(initialData.employee_skills?.map((s: any) => s.service_id) || []);
      setSelectedLocations(initialData.employee_locations?.map((l: any) => l.location_id) || []);
    }
  }, [initialData, form]);

  // Update form when selected locations change
  useEffect(() => {
    form.setValue('locations', selectedLocations);
  }, [selectedLocations, form]);

  // Update form when selected skills change
  useEffect(() => {
    form.setValue('skills', selectedSkills);
  }, [selectedSkills, form]);

  const handleFormSubmit = (data: StaffFormData) => {
    const updatedData = {
      ...data,
      photo_url: images[0] || null,
    };
    onSubmit(updatedData);
  };

  const handleLocationChange = (locationId: string) => {
    setSelectedLocations(prev => {
      if (prev.includes(locationId)) {
        return prev.filter(id => id !== locationId);
      } else {
        return [...prev, locationId];
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input {...field} />
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
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <ImageUploadSection
          images={images}
          setImages={setImages}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="employment_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Employment Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="stylist">Stylist</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                </SelectContent>
              </Select>
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
          name="skills"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Skills *</FormLabel>
              <FormControl>
                <ServiceMultiSelect
                  selectedServices={field.value}
                  onServiceSelect={(serviceId) => {
                    setSelectedSkills([...field.value, serviceId]);
                  }}
                  onServiceRemove={(serviceId) => {
                    setSelectedSkills(field.value.filter(id => id !== serviceId));
                  }}
                />
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
            {employeeId ? 'Update Staff Member' : 'Create Staff Member'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
