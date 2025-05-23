import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface HeaderActionsProps {
  onAdd: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function HeaderActions({ onAdd, searchQuery, onSearchChange }: HeaderActionsProps) {
  const isMobile = useIsMobile();

  return (
    <div className={`${isMobile ? 'space-y-4' : 'flex items-center justify-between'}`}>
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Staff Members</h2>
        <p className="text-sm text-muted-foreground">
          Manage your staff members and their roles
        </p>
      </div>

      <div className={`flex ${isMobile ? 'flex-col' : 'items-center'} gap-4 ${isMobile ? 'w-full' : ''}`}>        <div className={`flex items-center gap-3 ${isMobile ? 'justify-between w-full' : ''}`}>          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search Staff members..."
              className="pl-9 pr-4 w-full lg:w-[350px] h-10 rounded-md"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
            {/* Filters button removed as requested */}

          <Button onClick={onAdd} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {!isMobile && "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}
