import { Grid, List } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ViewToggleProps {
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex gap-1">
      <Button
        variant={view === 'grid' ? 'default' : 'ghost'}
        size="icon"
        onClick={() => onViewChange('grid')}
      >
        <Grid className="h-4 w-4" />
      </Button>
      <Button
        variant={view === 'list' ? 'default' : 'ghost'}
        size="icon"
        onClick={() => onViewChange('list')}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}