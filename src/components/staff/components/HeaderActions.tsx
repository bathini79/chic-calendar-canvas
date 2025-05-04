import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Grid, List, Search } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface HeaderActionsProps {
  onAdd: () => void;
  view: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function HeaderActions({ onAdd, view, onViewChange, searchQuery, onSearchChange }: HeaderActionsProps) {
  const isMobile = useIsMobile();

  return (
    <div className={`${isMobile ? 'space-y-4' : 'flex items-center justify-between'}`}>
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Staff</h2>
        <p className="text-sm text-muted-foreground">
          Manage your staff members and their roles
        </p>
      </div>

      <div className={`flex ${isMobile ? 'flex-col' : 'items-center'} gap-4 ${isMobile ? 'w-full' : ''}`}>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search staff members..."
            className="w-full pl-8"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        
        <div className={`flex items-center gap-2 ${isMobile ? 'justify-between w-full' : ''}`}>
          <div className="flex items-center gap-2">
            <Button
              variant={view === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => onViewChange("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => onViewChange("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button onClick={onAdd} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {!isMobile && "Add Staff"}
          </Button>
        </div>
      </div>
    </div>
  );
}
