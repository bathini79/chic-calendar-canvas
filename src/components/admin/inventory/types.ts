
export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  minimum_quantity: number;
  max_quantity: number;
  unit_price: number;
  status: string;
  created_at: string;
  updated_at: string;
  categories: string[];
  suggested_order_quantity: number;
  supplier?: { id: string; name: string; }[];
}
