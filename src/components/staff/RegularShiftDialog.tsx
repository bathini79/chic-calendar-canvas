import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { addWeeks, format, startOfWeek, endOfWeek } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Trash2, CalendarCheck, Plus, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface RegularShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: any;
}

interface DayShift {
  startTime: string;
  endTime: string;
}

interface DayConfig {
  enabled: boolean;
  shifts: DayShift[];
}

interface WeekConfig {
  days: Record<string, DayConfig>;
}

const DAYS = [
  { label: "Monday", value: "1", duration: "9h" },
  { label: "Tuesday", value: "2", duration: "9h" },
  { label: "Wednesday", value: "3", duration: "9h" },
  { label: "Thursday", value: "4", duration: "9h" },
  { label: "Friday", value: "5", duration: "9h" },
  { label: "Saturday", value: "6", duration: "7h" },
  { label: "Sunday", value: "0", duration: "0h" },
];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

const createDefaultDayConfig = (dayValue: string): DayConfig => ({
  enabled: false,
  shifts: [{
    startTime: "09:00",
    endTime: dayValue === "6" ? "17:00" : "18:00"
  }]
});

const createDefaultWeekConfig = (): Record<string, DayConfig> => {
  const config: Record<string, DayConfig> = {};
  DAYS.forEach(day => {
    config[day.value] = createDefaultDayConfig(day.value);
  });
  return config;
};

export function RegularShiftDialog({ open, onOpenChange, employee }: RegularShiftDialogProps) {
  const queryClient = useQueryClient();
  const [scheduleType, setScheduleType] = useState("1");
  const [currentWeek, setCurrentWeek] = useState(0);
  const [weekConfigs, setWeekConfigs] = useState<WeekConfig[]>(() => {
    return Array(4).fill(null).map(() => ({
      days: createDefaultWeekConfig()
    }));
  });

  // Fetch existing shifts for the selected date range
  const { data: existingShifts, isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', employee?.id, scheduleType, currentWeek],
    queryFn: async () => {
      if (!employee) return [];
      
      const startDate = startOfWeek(new Date());
      const endDate = endOfWeek(addWeeks(startDate, parseInt(scheduleType)));
      
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

  const handleAddShift = (weekIndex: number, dayValue: string) => {
    setWeekConfigs(prev => {
      const newConfigs = [...prev];
      newConfigs[weekIndex] = {
        days: {
          ...newConfigs[weekIndex].days,
          [dayValue]: {
            ...newConfigs[weekIndex].days[dayValue],
            shifts: [
              ...newConfigs[weekIndex].days[dayValue].shifts,
              { startTime: "09:00", endTime: "18:00" }
            ]
          }
        }
      };
      return newConfigs;
    });
  };

  const handleRemoveShift = (weekIndex: number, dayValue: string, shiftIndex: number) => {
    setWeekConfigs(prev => {
      const newConfigs = [...prev];
      newConfigs[weekIndex] = {
        days: {
          ...newConfigs[weekIndex].days,
          [dayValue]: {
            ...newConfigs[weekIndex].days[dayValue],
            shifts: newConfigs[weekIndex].days[dayValue].shifts.filter((_, index) => index !== shiftIndex)
          }
        }
      };
      return newConfigs;
    });
  };

  const handleSubmit = async () => {
    try {
      const startDate = startOfWeek(new Date());
      const shifts = [];
      const totalWeeks = parseInt(scheduleType);

      // Create shifts for each week in the schedule
      for (let week = 0; week < totalWeeks; week++) {
        const weekConfig = weekConfigs[week];
        const weekStart = addWeeks(startDate, week);
        
        // Create shifts for each day in the week
        for (let date = new Date(weekStart); date <= endOfWeek(weekStart); date.setDate(date.getDate() + 1)) {
          const dayOfWeek = date.getDay().toString();
          const dayConfig = weekConfig.days[dayOfWeek];
          
          if (dayConfig.enabled) {
            // Create shifts for each time slot in the day
            dayConfig.shifts.forEach(shift => {
              const [startHour] = shift.startTime.split(':');
              const [endHour] = shift.endTime.split(':');
              
              const shiftStart = new Date(date);
              shiftStart.setHours(parseInt(startHour), 0, 0);
              
              const shiftEnd = new Date(date);
              shiftEnd.setHours(parseInt(endHour), 0, 0);

              // Create recurring shifts for future weeks based on the pattern
              for (let futureWeek = week; futureWeek < totalWeeks * 2; futureWeek += totalWeeks) {
                const futureShiftStart = addWeeks(shiftStart, futureWeek);
                const futureShiftEnd = addWeeks(shiftEnd, futureWeek);

                shifts.push({
                  employee_id: employee.id,
                  start_time: futureShiftStart.toISOString(),
                  end_time: futureShiftEnd.toISOString(),
                  status: 'pending'
                });
              }
            });
          }
        }
      }

      // Delete existing shifts in the date range
      const { error: deleteError } = await supabase
        .from('shifts')
        .delete()
        .eq('employee_id', employee.id)
        .gte('start_time', startDate.toISOString())
        .lte('end_time', endOfWeek(addWeeks(startDate, parseInt(scheduleType) * 2 - 1)).toISOString());

      if (deleteError) throw deleteError;

      // Insert new shifts
      const { error: insertError } = await supabase
        .from('shifts')
        .insert(shifts);

      if (insertError) throw insertError;

      toast.success("Regular shifts created successfully");
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
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
                <Select value={currentWeek.toString()} onValueChange={(value) => setCurrentWeek(parseInt(value))}>
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
                  <div key={day.value} className="pt-4 first:pt-0">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`${currentWeek}-${day.value}`}
                        checked={dayConfig.enabled}
                        onCheckedChange={(checked) => {
                          setWeekConfigs(prev => {
                            const newConfigs = [...prev];
                            newConfigs[currentWeek] = {
                              days: {
                                ...newConfigs[currentWeek].days,
                                [day.value]: {
                                  ...newConfigs[currentWeek].days[day.value],
                                  enabled: checked as boolean
                                }
                              }
                            };
                            return newConfigs;
                          });
                        }}
                      />
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <label htmlFor={`${currentWeek}-${day.value}`} className="text-sm font-medium">
                            {day.label}
                          </label>
                          <Badge variant="secondary" className="text-xs">
                            {day.duration}
                          </Badge>
                        </div>

                        {dayConfig.enabled && (
                          <div className="space-y-2">
                            {dayConfig.shifts.map((shift, index) => (
                              <div key={index} className="flex items-center gap-2 bg-accent/5 p-2 rounded-md">
                                <Select
                                  value={shift.startTime}
                                  onValueChange={(value) => {
                                    setWeekConfigs(prev => {
                                      const newConfigs = [...prev];
                                      newConfigs[currentWeek].days[day.value].shifts[index].startTime = value;
                                      return newConfigs;
                                    });
                                  }}
                                >
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

                                <Select
                                  value={shift.endTime}
                                  onValueChange={(value) => {
                                    setWeekConfigs(prev => {
                                      const newConfigs = [...prev];
                                      newConfigs[currentWeek].days[day.value].shifts[index].endTime = value;
                                      return newConfigs;
                                    });
                                  }}
                                >
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

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveShift(currentWeek, day.value, index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            
                            <Button
                              variant="ghost"
                              className="text-muted-foreground"
                              onClick={() => handleAddShift(currentWeek, day.value)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add a shift
                            </Button>

                            {dayShifts && dayShifts.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <p className="text-sm text-muted-foreground">Existing shifts:</p>
                                {dayShifts.map((shift, index) => (
                                  <div key={index} className="text-sm bg-accent/10 px-2 py-1 rounded">
                                    {format(new Date(shift.start_time), 'h:mm a')} - {format(new Date(shift.end_time), 'h:mm a')}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {!dayConfig.enabled && dayShifts && dayShifts.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Existing shifts:</p>
                            {dayShifts.map((shift, index) => (
                              <div key={index} className="text-sm bg-accent/10 px-2 py-1 rounded">
                                {format(new Date(shift.start_time), 'h:mm a')} - {format(new Date(shift.end_time), 'h:mm a')}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}