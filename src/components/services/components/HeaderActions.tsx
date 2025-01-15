import { Button } from "@/components/ui/button";
import { ViewToggle } from "./ViewToggle";

interface HeaderActionsProps {
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
  onCreateClick: () => void;
  type?: 'service' | 'category' | 'package';
}

export function HeaderActions({ 
  view, 
  onViewChange, 
  onCreateClick,
  type = 'service'
}: HeaderActionsProps) {
  const getButtonText = () => {
    switch (type) {
      case 'service':
        return 'Add Service';
      case 'category':
        return 'Add Category';
      case 'package':
        return 'Add Package';
      default:
        return 'Add New';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <ViewToggle view={view} onViewChange={onViewChange} />
      <Button onClick={onCreateClick}>
        {getButtonText()}
      </Button>
    </div>
  );
}