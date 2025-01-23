import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";

interface ShiftPlannerHeaderProps {
  currentWeek: Date;
  onWeekChange: (direction: 'prev' | 'next') => void;
}

export function ShiftPlannerHeader({ currentWeek, onWeekChange }: ShiftPlannerHeaderProps) {
  const weekStart = startOfWeek(currentWeek);
  const weekEnd = endOfWeek(currentWeek);

  return (
    <div className="flex items-center justify-between bg-card p-4 rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        Shift Planner
      </h2>
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onWeekChange('prev')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="text-sm font-medium bg-accent/10 px-4 py-2 rounded-md flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          {format(weekStart, "d MMM")} - {format(weekEnd, "d MMM, yyyy")}
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => onWeekChange('next')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}