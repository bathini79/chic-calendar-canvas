import * as z from "zod";

export const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required"),
});

export const serviceFormSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  categories: z.array(z.string()).min(1, "At least one category is required"),
  original_price: z.number().min(0, "Price must be greater than or equal to 0"),
  selling_price: z.number().min(0, "Price must be greater than or equal to 0"),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  description: z.string().optional(),
  image_urls: z.array(z.string()).optional(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
export type ServiceFormValues = z.infer<typeof serviceFormSchema>;