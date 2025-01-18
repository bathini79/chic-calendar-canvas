import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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

export type PackageFormData = z.infer<typeof formSchema>;

export function usePackageForm(initialData?: any) {
  const form = useForm<PackageFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
    },
  });

  return form;
}