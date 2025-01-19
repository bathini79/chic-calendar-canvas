import { useState } from "react";
import { WeekConfig, createDefaultWeekConfig } from "../types/shift-types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useScheduleState(employee: any) {
  const [scheduleType, setScheduleType] = useState("1");
  const [currentWeek, setCurrentWeek] = useState(0);
  const [weekConfigs, setWeekConfigs] = useState<WeekConfig[]>(() => {
    return Array(4).fill(null).map(() => ({
      days: createDefaultWeekConfig()
    }));
  });

  const handleSubmit = async () => {
    try {
      // Delete existing recurring shifts for this employee
      const { error: deleteError } = await supabase
        .from('recurring_shifts')
        .delete()
        .eq('employee_id', employee.id);

      if (deleteError) throw deleteError;

      // Create new recurring shift patterns
      const patterns = [];
      const totalWeeks = parseInt(scheduleType);

      // Generate patterns for each week in the rotation
      for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex++) {
        const weekConfig = weekConfigs[weekIndex];
        
        Object.entries(weekConfig.days).forEach(([dayValue, dayConfig]) => {
          if (dayConfig.enabled) {
            dayConfig.shifts.forEach(shift => {
              patterns.push({
                employee_id: employee.id,
                day_of_week: parseInt(dayValue),
                start_time: shift.startTime,
                end_time: shift.endTime,
                effective_from: new Date().toISOString(),
                effective_until: null
              });
            });
          }
        });
      }

      // Insert new patterns
      if (patterns.length > 0) {
        const { error: insertError } = await supabase
          .from('recurring_shifts')
          .insert(patterns);

        if (insertError) throw insertError;
      }

      toast.success("Regular shifts pattern saved successfully");
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  return {
    scheduleType,
    setScheduleType,
    currentWeek,
    setCurrentWeek,
    weekConfigs,
    setWeekConfigs,
    handleSubmit
  };
}