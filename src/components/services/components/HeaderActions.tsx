import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "./ViewToggle";

interface HeaderActionsProps {
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
  onCreateClick: () => void;
}

export function HeaderActions({ view, onViewChange, onCreateClick }: HeaderActionsProps) {
  return (
    <div className="flex gap-2 items-center justify-between sm:justify-end">
      <ViewToggle view={view} onViewChange={onViewChange} />
      <Button onClick={onCreateClick}>
        <Plus className="h-4 w-4 mr-2" />
        Add Service
      </Button>
    </div>
  );
}