
export type ItemStatus = 'active' | 'inactive';

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  unit_of_quantity: string;
  created_at: string;
  updated_at: string;
  inventory_items_categories: Array<{ category_id: string }>;
  has_location_specific_data?: boolean;
}

export interface InventoryLocationItem {
  id: string;
  item_id: string;
  location_id: string;
  quantity: number;
  minimum_quantity: number;
  max_quantity: number;
  unit_price: number;
  supplier_id?: string;
  status: ItemStatus;
  categories: string[];
  created_at: string;
  updated_at: string;
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

export interface Location {
  id: string;
  name: string;
  status: string;
}
