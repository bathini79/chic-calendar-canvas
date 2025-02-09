
import { z } from "zod";

export const purchaseOrderItemSchema = z.object({
  item_id: z.string().min(1, "Item is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  purchase_price: z.number().min(0, "Purchase price must be 0 or greater"),
  tax_rate: z.number().min(0, "Tax rate must be 0 or greater").max(100, "Tax rate cannot exceed 100"),
  expiry_date: z.date().optional(),
  received_quantity: z.number().optional(),
});

export const purchaseOrderSchema = z.object({
  supplier_id: z.string().min(1, "Supplier is required"),
  invoice_number: z.string().min(1, "Invoice number is required"),
  receipt_number: z.string().optional(),
  order_date: z.date(),
  tax_inclusive: z.boolean().default(false),
  notes: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, "At least one item is required"),
});

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;
export type PurchaseOrderItemFormValues = z.infer<typeof purchaseOrderItemSchema>;
