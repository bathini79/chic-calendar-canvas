
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit_of_quantity: string;
}

interface ItemRequirement {
  id?: string;
  itemId: string;
  quantity: number;
}

interface ServiceInventoryRequirementsProps {
  serviceId: string;
  onSave?: () => void;
}

export function ServiceInventoryRequirements({ 
  serviceId,
  onSave
}: ServiceInventoryRequirementsProps) {
  const [itemRequirements, setItemRequirements] = useState<ItemRequirement[]>([
    { itemId: "", quantity: 1 }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch inventory items
  const { data: inventoryItems } = useQuery({
    queryKey: ["inventory_items_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, quantity, unit_of_quantity")
        .eq("status", "active");

      if (error) throw error;
      return data as InventoryItem[];
    },
  });

  // Fetch existing requirements
  const { data: existingRequirements, refetch } = useQuery({
    queryKey: ["service_inventory_requirements", serviceId],
    queryFn: async () => {
      if (!serviceId) return [];
      
      const { data, error } = await supabase
        .from("service_inventory_requirements")
        .select(`
          id,
          item_id,
          quantity_required
        `)
        .eq("service_id", serviceId);

      if (error) throw error;
      return data;
    },
    enabled: !!serviceId
  });

  // Load existing requirements
  useEffect(() => {
    if (existingRequirements && existingRequirements.length > 0) {
      const mappedRequirements = existingRequirements.map(req => ({
        id: req.id,
        itemId: req.item_id,
        quantity: req.quantity_required
      }));
      setItemRequirements(mappedRequirements);
    } else if (existingRequirements && existingRequirements.length === 0) {
      setItemRequirements([{ itemId: "", quantity: 1 }]);
    }
  }, [existingRequirements]);

  const handleAddItem = () => {
    setItemRequirements([...itemRequirements, { itemId: "", quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItemRequirements(itemRequirements.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'itemId' | 'quantity', value: string | number) => {
    const newItemRequirements = [...itemRequirements];
    newItemRequirements[index][field] = value;
    setItemRequirements(newItemRequirements);
  };

  const handleSaveRequirements = async () => {
    if (!serviceId) return;
    
    // Filter out incomplete entries
    const validRequirements = itemRequirements.filter(req => req.itemId);
    
    if (validRequirements.length === 0) {
      // If no requirements, delete any existing ones
      const { error } = await supabase
        .from('service_inventory_requirements')
        .delete()
        .eq('service_id', serviceId);
      
      if (error) {
        console.error("Error deleting requirements:", error);
      }
      
      if (onSave) onSave();
      return;
    }
    
    setIsLoading(true);
    
    try {
      // First delete any existing requirements
      await supabase
        .from('service_inventory_requirements')
        .delete()
        .eq('service_id', serviceId);
      
      // Then insert the new ones
      const { error } = await supabase
        .from('service_inventory_requirements')
        .insert(
          validRequirements.map(req => ({
            service_id: serviceId,
            item_id: req.itemId,
            quantity_required: req.quantity
          }))
        );
      
      if (error) throw error;
      
      refetch();
      if (onSave) onSave();
    } catch (error) {
      console.error("Error saving requirements:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Inventory Requirements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          Define which inventory items are consumed when this service is completed
        </div>
        
        {itemRequirements.map((req, index) => (
          <div key={index} className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-xs">Item</Label>
              <Select
                value={req.itemId}
                onValueChange={(value) => handleItemChange(index, 'itemId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems?.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.quantity} {item.unit_of_quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-24">
              <Label className="text-xs">Quantity</Label>
              <Input
                type="number"
                min="0.1"
                step="0.1"
                value={req.quantity}
                onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
              />
            </div>
            
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleRemoveItem(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        <div className="flex justify-between mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> Add Item
          </Button>
          
          <Button 
            onClick={handleSaveRequirements}
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Requirements"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
