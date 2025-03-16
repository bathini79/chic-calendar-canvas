
import { z } from "zod";

export const locationItemSchema = z.object({
  quantity: z.number().min(0, "Quantity must be 0 or greater"),
  minimum_quantity: z.number().min(0, "Minimum quantity must be 0 or greater"),
  max_quantity: z.number().min(0, "Maximum quantity must be 0 or greater"),
  unit_price: z.number().min(0, "Unit price must be 0 or greater"),
  categories: z.array(z.string()).default([]),
  status: z.enum(["active", "inactive"]).default("active"),
  supplier_id: z.string(),
  location_id: z.string().min(1, "Location is required"),
});

export const itemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  unit_of_quantity: z.string().min(1, "Unit of quantity is required"),
  locationItems: z.array(locationItemSchema)
});

export type ItemFormValues = z.infer<typeof itemSchema>;
export type LocationItemFormValues = z.infer<typeof locationItemSchema>;
