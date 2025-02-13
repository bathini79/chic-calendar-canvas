
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Grid, List, Plus } from "lucide-react";

interface HeaderActionsProps {
  onAdd: () => void;
  view: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function HeaderActions({
  onAdd,
  view,
  onViewChange,
  searchQuery,
  onSearchChange,
}: HeaderActionsProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
      <div className="flex items-center gap-4">
        <div className="relative w-full max-w-[180px] sm:max-w-[200px]">
          <Input
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => onViewChange("grid")}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => onViewChange("list")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={onAdd} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>
    </div>
  );
}
