import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Inventory() {
  const { data: items, isLoading } = useSupabaseCrud('inventory_items');

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4 p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-lg">
          <h3 className="font-medium mb-2">Total Items</h3>
          <p className="text-2xl font-bold">{items?.length || 0}</p>
        </div>
        <div className="bg-card p-4 rounded-lg">
          <h3 className="font-medium mb-2">Low Stock Items</h3>
          <p className="text-2xl font-bold text-yellow-500">
            {items?.filter(item => item.quantity <= item.minimum_quantity).length || 0}
          </p>
        </div>
        <div className="bg-card p-4 rounded-lg">
          <h3 className="font-medium mb-2">Total Value</h3>
          <p className="text-2xl font-bold">
            ${items?.reduce((total, item) => total + (item.quantity * Number(item.unit_price)), 0).toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      <div className="bg-card rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Min. Quantity</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items?.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.sku || '-'}</TableCell>
                <TableCell>
                  <Badge variant={item.quantity <= item.minimum_quantity ? "destructive" : "default"}>
                    {item.quantity}
                  </Badge>
                </TableCell>
                <TableCell>{item.minimum_quantity}</TableCell>
                <TableCell>${Number(item.unit_price).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={item.status === 'active' ? "default" : "secondary"}>
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">Edit</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}