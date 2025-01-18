import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarCheck, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DAYS } from "./types/shift-types";
import { DayConfiguration } from "./DayConfiguration";
import { useScheduleState } from "./hooks/useScheduleState";

interface RegularShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: any;
}

export function RegularShiftDialog({ open, onOpenChange, employee }: RegularShiftDialogProps) {
  const {
    scheduleType,
    setScheduleType,
    currentWeek,
    setCurrentWeek,
    weekConfigs,
    setWeekConfigs,
    handleSubmit
  } = useScheduleState(employee);

  // Fetch existing shifts for the selected date range
  const { data: existingShifts, isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', employee?.id, scheduleType, currentWeek],
    queryFn: async () => {
      if (!employee) return [];
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of current week
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (parseInt(scheduleType) * 7) - 1);
      
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('employee_id', employee.id)
        .gte('start_time', startDate.toISOString())
        .lte('end_time', endDate.toISOString());
      
      if (error) throw error;
      return data;
    },
    enabled: !!employee,
  });

  const handleSave = async () => {
    const success = await handleSubmit();
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            Set {employee?.name}'s regular shifts
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[300px,1fr] gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Schedule type</label>
              <Select value={scheduleType} onValueChange={setScheduleType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 week</SelectItem>
                  <SelectItem value="2">2 weeks</SelectItem>
                  <SelectItem value="3">3 weeks</SelectItem>
                  <SelectItem value="4">4 weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {parseInt(scheduleType) > 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Current week</label>
                <Select
                  value={currentWeek.toString()}
                  onValueChange={(value) => setCurrentWeek(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: parseInt(scheduleType) }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        Week {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {existingShifts && existingShifts.length > 0 && (
              <Alert className="bg-accent/50">
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  There are {existingShifts.length} existing shifts in this period
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-6">
            <h3 className="font-semibold flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              Week {currentWeek + 1} of {scheduleType}
            </h3>
            
            <div className="space-y-4 divide-y">
              {DAYS.map((day) => {
                const dayConfig = weekConfigs[currentWeek].days[day.value];
                const dayShifts = existingShifts?.filter(shift => 
                  new Date(shift.start_time).getDay().toString() === day.value
                );

                return (
                  <DayConfiguration
                    key={day.value}
                    dayLabel={day.label}
                    dayValue={day.value}
                    duration={day.duration}
                    config={dayConfig}
                    existingShifts={dayShifts}
                    onConfigChange={(newConfig) => {
                      setWeekConfigs(prev => {
                        const newConfigs = [...prev];
                        newConfigs[currentWeek] = {
                          days: {
                            ...newConfigs[currentWeek].days,
                            [day.value]: newConfig
                          }
                        };
                        return newConfigs;
                      });
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}