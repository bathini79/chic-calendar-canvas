import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { ShiftTimeSelector } from "./ShiftTimeSelector";
import { DayConfig } from "./types/shift-types";

interface DayConfigurationProps {
  dayLabel: string;
  dayValue: string;
  duration: string;
  config: DayConfig;
  existingShifts?: any[];
  onConfigChange: (config: DayConfig) => void;
}

export function DayConfiguration({
  dayLabel,
  dayValue,
  duration,
  config,
  existingShifts,
  onConfigChange,
}: DayConfigurationProps) {
  const handleAddShift = () => {
    onConfigChange({
      ...config,
      shifts: [...config.shifts, { startTime: "09:00", endTime: "18:00" }],
    });
  };

  const handleRemoveShift = (index: number) => {
    onConfigChange({
      ...config,
      shifts: config.shifts.filter((_, i) => i !== index),
    });
  };

  const handleShiftChange = (index: number, field: "startTime" | "endTime", value: string) => {
    const newShifts = [...config.shifts];
    newShifts[index] = { ...newShifts[index], [field]: value };
    onConfigChange({ ...config, shifts: newShifts });
  };

  return (
    <div className="pt-4 first:pt-0">
      <div className="flex items-start gap-3">
        <Checkbox
          id={dayValue}
          checked={config.enabled}
          onCheckedChange={(checked) =>
            onConfigChange({ ...config, enabled: checked as boolean })
          }
        />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <label htmlFor={dayValue} className="text-sm font-medium">
              {dayLabel}
            </label>
            <Badge variant="secondary" className="text-xs">
              {duration}
            </Badge>
          </div>

          {config.enabled && (
            <div className="space-y-2">
              {config.shifts.map((shift, index) => (
                <ShiftTimeSelector
                  key={index}
                  startTime={shift.startTime}
                  endTime={shift.endTime}
                  onStartTimeChange={(value) =>
                    handleShiftChange(index, "startTime", value)
                  }
                  onEndTimeChange={(value) =>
                    handleShiftChange(index, "endTime", value)
                  }
                  onRemove={() => handleRemoveShift(index)}
                />
              ))}

              <Button
                variant="ghost"
                className="text-muted-foreground"
                onClick={handleAddShift}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add a shift
              </Button>

              {existingShifts && existingShifts.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Existing shifts:
                  </p>
                  {existingShifts.map((shift, index) => (
                    <div
                      key={index}
                      className="text-sm bg-accent/10 px-2 py-1 rounded"
                    >
                      {format(new Date(shift.start_time), "h:mm a")} -{" "}
                      {format(new Date(shift.end_time), "h:mm a")}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!config.enabled && existingShifts && existingShifts.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Existing shifts:</p>
              {existingShifts.map((shift, index) => (
                <div
                  key={index}
                  className="text-sm bg-accent/10 px-2 py-1 rounded"
                >
                  {format(new Date(shift.start_time), "h:mm a")} -{" "}
                  {format(new Date(shift.end_time), "h:mm a")}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}