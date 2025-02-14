
import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contact_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  items: z.array(z.string()).default([]),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;
