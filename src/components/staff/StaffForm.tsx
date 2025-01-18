import { useForm, useFieldArray } from "react-hook-form";
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
import { useState } from "react";
import { TimeInput } from "@/components/ui/time-input";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  photo_url: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  skills: z.array(z.string()).min(1, "At least one skill is required"),
  availability: z.array(z.object({
    day_of_week: z.number(),
    start_time: z.string(),
    end_time: z.string(),
  })),
});

type StaffFormData = z.infer<typeof formSchema>;

interface StaffFormProps {
  initialData?: any;
  onSubmit: (data: StaffFormData) => void;
  onCancel: () => void;
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function StaffForm({ initialData, onSubmit, onCancel }: StaffFormProps) {
  const [images, setImages] = useState<string[]>(
    initialData?.photo_url ? [initialData.photo_url] : []
  );

  const form = useForm<StaffFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      photo_url: initialData?.photo_url || '',
      status: initialData?.status || 'active',
      skills: initialData?.employee_skills?.map((s: any) => s.service.id) || [],
      availability: initialData?.employee_availability || DAYS_OF_WEEK.map((_, index) => ({
        day_of_week: index,
        start_time: '09:00',
        end_time: '17:00',
      })),
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "availability",
  });

  const handleFormSubmit = (data: StaffFormData) => {
    // Update photo_url with the first image from the images array
    const updatedData = {
      ...data,
      photo_url: images[0] || null,
    };
    onSubmit(updatedData);
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
          name="skills"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Skills *</FormLabel>
              <FormControl>
                <ServiceMultiSelect
                  selectedServices={field.value}
                  onServiceSelect={(serviceId) => {
                    field.onChange([...field.value, serviceId]);
                  }}
                  onServiceRemove={(serviceId) => {
                    field.onChange(field.value.filter(id => id !== serviceId));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <h3 className="font-medium">Availability</h3>
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-4">
              <div className="w-24">
                <span className="text-sm">{DAYS_OF_WEEK[index]}</span>
              </div>
              <FormField
                control={form.control}
                name={`availability.${index}.start_time`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <TimeInput {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <span className="text-sm">to</span>
              <FormField
                control={form.control}
                name={`availability.${index}.end_time`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <TimeInput {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {initialData ? 'Update Staff Member' : 'Create Staff Member'}
          </Button>
        </div>
      </form>
    </Form>
  );
}