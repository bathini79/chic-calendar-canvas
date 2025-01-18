import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { addWeeks, format, startOfWeek } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

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

export function RegularShiftDialog({ open, onOpenChange, employee }: RegularShiftDialogProps) {
  const queryClient = useQueryClient();
  const [scheduleType, setScheduleType] = useState("1");
  const [currentWeek, setCurrentWeek] = useState(0);
  const [dayConfigs, setDayConfigs] = useState<Record<string, DayConfig>>(() => {
    const configs: Record<string, DayConfig> = {};
    DAYS.forEach(day => {
      configs[day.value] = {
        enabled: false,
        shifts: [{
          startTime: "09:00",
          endTime: day.value === "6" ? "17:00" : "18:00"
        }]
      };
    });
    return configs;
  });

  const handleAddShift = (dayValue: string) => {
    setDayConfigs(prev => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        shifts: [
          ...prev[dayValue].shifts,
          { startTime: "09:00", endTime: "18:00" }
        ]
      }
    }));
  };

  const handleRemoveShift = (dayValue: string, shiftIndex: number) => {
    setDayConfigs(prev => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        shifts: prev[dayValue].shifts.filter((_, index) => index !== shiftIndex)
      }
    }));
  };

  const handleSubmit = async () => {
    try {
      const startDate = startOfWeek(new Date());
      const endDate = addWeeks(startDate, parseInt(scheduleType));
      const shifts = [];

      for (let week = 0; week < parseInt(scheduleType); week++) {
        const weekStart = addWeeks(startDate, week);
        
        for (let date = new Date(weekStart); date <= addWeeks(weekStart, 1); date.setDate(date.getDate() + 1)) {
          const dayOfWeek = date.getDay().toString();
          const dayConfig = dayConfigs[dayOfWeek];
          
          if (dayConfig.enabled) {
            dayConfig.shifts.forEach(shift => {
              const [startHour] = shift.startTime.split(':');
              const [endHour] = shift.endTime.split(':');
              
              const shiftStart = new Date(date);
              shiftStart.setHours(parseInt(startHour), 0, 0);
              
              const shiftEnd = new Date(date);
              shiftEnd.setHours(parseInt(endHour), 0, 0);

              shifts.push({
                employee_id: employee.id,
                start_time: shiftStart.toISOString(),
                end_time: shiftEnd.toISOString(),
                status: 'pending'
              });
            });
          }
        }
      }

      const { error } = await supabase
        .from('shifts')
        .insert(shifts);

      if (error) throw error;

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
          <DialogTitle>Set {employee?.name}'s regular shifts</DialogTitle>
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

            <div className="bg-gray-50 p-4 rounded-lg flex gap-3">
              <div className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-gray-100">
                ℹ️
              </div>
              <p className="text-sm text-gray-900">
                Team members will not be scheduled on business closed periods.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="font-semibold">Week {currentWeek + 1} of {scheduleType}</h3>
            <div className="space-y-4">
              {DAYS.map((day) => {
                const dayConfig = dayConfigs[day.value];
                return (
                  <div key={day.value} className="flex items-start gap-3">
                    <Checkbox
                      id={day.value}
                      checked={dayConfig.enabled}
                      onCheckedChange={(checked) => {
                        setDayConfigs(prev => ({
                          ...prev,
                          [day.value]: {
                            ...prev[day.value],
                            enabled: checked as boolean
                          }
                        }));
                      }}
                    />
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <label htmlFor={day.value} className="text-sm font-medium">
                          {day.label}
                        </label>
                        <span className="text-sm text-muted-foreground">
                          {day.duration}
                        </span>
                      </div>

                      {dayConfig.enabled && (
                        <div className="space-y-2">
                          {dayConfig.shifts.map((shift, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Select
                                value={shift.startTime}
                                onValueChange={(value) => {
                                  setDayConfigs(prev => ({
                                    ...prev,
                                    [day.value]: {
                                      ...prev[day.value],
                                      shifts: prev[day.value].shifts.map((s, i) => 
                                        i === index ? { ...s, startTime: value } : s
                                      )
                                    }
                                  }));
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
                                  setDayConfigs(prev => ({
                                    ...prev,
                                    [day.value]: {
                                      ...prev[day.value],
                                      shifts: prev[day.value].shifts.map((s, i) => 
                                        i === index ? { ...s, endTime: value } : s
                                      )
                                    }
                                  }));
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
                                onClick={() => handleRemoveShift(day.value, index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          
                          <Button
                            variant="link"
                            className="text-gray-600 p-0 h-auto font-normal"
                            onClick={() => handleAddShift(day.value)}
                          >
                            Add a shift
                          </Button>
                        </div>
                      )}

                      {!dayConfig.enabled && (
                        <p className="text-sm text-muted-foreground">No shifts</p>
                      )}
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