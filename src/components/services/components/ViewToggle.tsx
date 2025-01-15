import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ViewToggleProps {
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center border rounded-lg overflow-hidden">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange('grid')}
        className={`rounded-none ${view === 'grid' ? 'bg-secondary' : ''}`}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange('list')}
        className={`rounded-none ${view === 'list' ? 'bg-secondary' : ''}`}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}