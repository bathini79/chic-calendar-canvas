
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface HeaderActionsProps {
  onAdd: () => void;
}

export function HeaderActions({
  onAdd,
}: HeaderActionsProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4 mr-2" />
        Add Item
      </Button>
    </div>
  );
}
