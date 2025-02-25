
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UnitSectionProps {
  value: string;
  onValueChange: (value: string) => void;
  units: Array<{ id: string; name: string }>;
}

export function UnitSection({ value, onValueChange, units }: UnitSectionProps) {
  const [newUnit, setNewUnit] = useState("");
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleAddUnit = async () => {
    if (!newUnit.trim()) {
      toast.error("Unit name cannot be empty");
      return;
    }

    try {
      const { error } = await supabase
        .from("inventory_units")
        .insert([{ name: newUnit.toUpperCase() }]);

      if (error) throw error;

      toast.success("Unit added successfully");
      setNewUnit("");
      setIsAddUnitOpen(false);
      queryClient.invalidateQueries({ queryKey: ['inventory_units'] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div>
      <label className="text-sm font-medium">Unit of Quantity</label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a unit" />
          </SelectTrigger>
          <SelectContent>
            {units.map((unit) => (
              <SelectItem key={unit.id} value={unit.name}>
                {unit.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={isAddUnitOpen} onOpenChange={setIsAddUnitOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Unit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Unit Name</label>
                <Input
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  placeholder="e.g., BOX"
                />
              </div>
              <Button type="button" onClick={handleAddUnit}>
                Add Unit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
