
import { useState } from "react";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
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
import { ItemDialog } from "../ItemDialog";
import { Plus, Trash2 } from "lucide-react";

export function ItemsList() {
  const { data: items, remove } = useSupabaseCrud('inventory_items');
  const [editingItem, setEditingItem] = useState<any>(null);

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await remove(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditingItem(null)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="bg-card rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Min. Quantity</TableHead>
              <TableHead>Max. Quantity</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items?.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <Badge variant={item.quantity <= item.minimum_quantity ? "destructive" : "default"}>
                    {item.quantity}
                  </Badge>
                </TableCell>
                <TableCell>{item.minimum_quantity}</TableCell>
                <TableCell>{item.max_quantity}</TableCell>
                <TableCell>${Number(item.unit_price).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={item.status === 'active' ? "default" : "secondary"}>
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setEditingItem(item)}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ItemDialog 
        open={editingItem !== null || false}
        item={editingItem} 
        onClose={() => setEditingItem(null)} 
      />
    </div>
  );
}
