import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { TIME_SLOTS } from "./types/shift-types";

interface ShiftTimeSelectorProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onRemove: () => void;
}

export function ShiftTimeSelector({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  onRemove,
}: ShiftTimeSelectorProps) {
  return (
    <div className="flex items-center gap-2 bg-accent/5 p-2 rounded-md">
      <Select value={startTime} onValueChange={onStartTimeChange}>
        <SelectTrigger className="w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIME_SLOTS.map((time) => (
            <SelectItem key={time} value={time}>
              {format(new Date().setHours(parseInt(time)), 'h:mm a')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span>-</span>

      <Select value={endTime} onValueChange={onEndTimeChange}>
        <SelectTrigger className="w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIME_SLOTS.map((time) => (
            <SelectItem key={time} value={time}>
              {format(new Date().setHours(parseInt(time)), 'h:mm a')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="ghost" size="icon" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}