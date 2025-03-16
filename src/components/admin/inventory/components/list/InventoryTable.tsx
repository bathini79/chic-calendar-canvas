
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Category, Supplier } from "../types";

interface InventoryTableProps {
  items: any[];
  categories?: Category[];
  suppliers?: Supplier[];
  locations?: Array<{ id: string; name: string }>;
  selectedLocation: string;
  editingStatus: string | null;
  onStatusEdit: (id: string) => void;
  onStatusChange: (itemId: string, locationId: string, newStatus: "active" | "inactive") => void;
  onCancelEdit: () => void;
  onEditItem: (item: any) => void;
  onDeleteItem: (id: string) => void;
}

export function InventoryTable({
  items,
  categories,
  suppliers,
  locations,
  selectedLocation,
  editingStatus,
  onStatusEdit,
  onStatusChange,
  onCancelEdit,
  onEditItem,
  onDeleteItem,
}: InventoryTableProps) {
  // Find the location name by ID
  const getLocationName = (locationId: string) => {
    return locations?.find(loc => loc.id === locationId)?.name || 'Unknown';
  };
  
  // Find supplier name by ID
  const getSupplierName = (supplierId: string) => {
    return suppliers?.find(s => s.id === supplierId)?.name || '-';
  };
  
  // Find category names by IDs array
  const getCategoryNames = (categoryIds: string[]) => {
    return categories
      ?.filter(cat => categoryIds?.includes(cat.id))
      .map(cat => (
        <Badge key={cat.id} variant="secondary" className="mr-1">
          {cat.name}
        </Badge>
      ));
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Min. Quantity</TableHead>
          <TableHead>Max. Quantity</TableHead>
          <TableHead>Unit</TableHead>
          <TableHead>Unit Price</TableHead>
          <TableHead>Supplier</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.flatMap(item => {
          const filteredLocationItems = selectedLocation === "all" 
            ? item.location_items 
            : item.location_items.filter(li => li.location_id === selectedLocation);
            
          return filteredLocationItems.map(li => (
            <TableRow key={`${item.id}-${li.location_id}`}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{getLocationName(li.location_id)}</TableCell>
              <TableCell>
                <Badge variant={li.quantity <= li.minimum_quantity ? "destructive" : "default"}>
                  {li.quantity} {item.unit_of_quantity}
                </Badge>
              </TableCell>
              <TableCell>{li.minimum_quantity} {item.unit_of_quantity}</TableCell>
              <TableCell>{li.max_quantity} {item.unit_of_quantity}</TableCell>
              <TableCell>{item.unit_of_quantity}</TableCell>
              <TableCell>${Number(li.unit_price).toFixed(2)}</TableCell>
              <TableCell>
                {getSupplierName(li.supplier_id)}
              </TableCell>
              <TableCell>
                {getCategoryNames(li.categories)}
              </TableCell>
              <TableCell>
                {editingStatus === `${item.id}-${li.location_id}` ? (
                  <div className="flex items-center gap-2">
                    <Select
                      defaultValue={li.status}
                      onValueChange={(value: "active" | "inactive") => onStatusChange(item.id, li.location_id, value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={onCancelEdit}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Badge
                    variant={li.status === 'active' ? "default" : "secondary"}
                    className="cursor-pointer"
                    onClick={() => onStatusEdit(`${item.id}-${li.location_id}`)}
                  >
                    {li.status}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onEditItem(item)}
                >
                  Edit
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onDeleteItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ));
        })}
      </TableBody>
    </Table>
  );
}
