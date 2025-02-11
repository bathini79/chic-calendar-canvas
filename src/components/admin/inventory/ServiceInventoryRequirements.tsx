
import { useState, useEffect } from "react";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash } from "lucide-react";

export function ServiceInventoryRequirements() {
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: services } = useSupabaseCrud("services");
  const { data: items } = useSupabaseCrud("inventory_items");
  const { data: requirements, create: createRequirement, remove: removeRequirement } = 
    useSupabaseCrud("service_inventory_requirements");

  const handleAddRequirement = async () => {
    if (!selectedService || !selectedItem || !quantity) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await createRequirement({
        service_id: selectedService,
        item_id: selectedItem,
        quantity_required: parseFloat(quantity),
      });

      setIsDialogOpen(false);
      setSelectedService("");
      setSelectedItem("");
      setQuantity("1");
    } catch (error: any) {
      // Error is already handled by useSupabaseCrud
    }
  };

  const getServiceName = (serviceId: string) => {
    return services?.find(s => s.id === serviceId)?.name || 'Unknown Service';
  };

  const getItemName = (itemId: string) => {
    return items?.find(i => i.id === itemId)?.name || 'Unknown Item';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Service Inventory Requirements</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Requirement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Inventory Requirement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Service</label>
                <Select
                  value={selectedService}
                  onValueChange={setSelectedService}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services?.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Item</label>
                <Select
                  value={selectedItem}
                  onValueChange={setSelectedItem}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items?.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Quantity Required</label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <Button onClick={handleAddRequirement} className="w-full">
                Add Requirement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Quantity Required</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requirements?.map((req) => (
              <TableRow key={req.id}>
                <TableCell>{getServiceName(req.service_id)}</TableCell>
                <TableCell>{getItemName(req.item_id)}</TableCell>
                <TableCell>{req.quantity_required}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRequirement(req.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
