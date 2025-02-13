
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
    <div className="flex justify-between items-center gap-4">
      <div className="flex-1 max-w-sm">
        <Input
          placeholder="Search inventory..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center border rounded-lg">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => onViewChange("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => onViewChange("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>
    </div>
  );
}
