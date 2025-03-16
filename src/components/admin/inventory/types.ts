
export type ItemStatus = 'active' | 'inactive';

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  minimum_quantity: number;
  max_quantity: number;
  unit_price: number;
  supplier_id?: string;
  unit_of_quantity: string;
  categories: string[];
  status: ItemStatus;
  created_at: string;
  updated_at: string;
  location_id?: string;
  inventory_items_categories: Array<{ category_id: string }>;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}
