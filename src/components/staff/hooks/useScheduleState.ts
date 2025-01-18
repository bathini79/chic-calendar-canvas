import { useState } from "react";
import { WeekConfig, createDefaultWeekConfig } from "../types/shift-types";
import { addWeeks, startOfWeek, endOfWeek, differenceInWeeks } from "date-fns";
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
      const startDate = startOfWeek(new Date());
      const shifts = [];
      const totalWeeks = parseInt(scheduleType);

      // Calculate how many weeks to generate shifts for (e.g., 8 weeks of shifts)
      const weeksToGenerate = totalWeeks * 4; // Generate 4 cycles worth of shifts

      // Create shifts for each week in the schedule
      for (let weekOffset = 0; weekOffset < weeksToGenerate; weekOffset++) {
        // Calculate which week configuration to use based on the rotation
        const weekConfigIndex = weekOffset % totalWeeks;
        const weekConfig = weekConfigs[weekConfigIndex];
        const weekStart = addWeeks(startDate, weekOffset);
        
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

      // Delete existing shifts in the date range
      const { error: deleteError } = await supabase
        .from('shifts')
        .delete()
        .eq('employee_id', employee.id)
        .gte('start_time', startDate.toISOString())
        .lte('end_time', endOfWeek(addWeeks(startDate, weeksToGenerate - 1)).toISOString());

      if (deleteError) throw deleteError;

      // Insert new shifts
      const { error: insertError } = await supabase
        .from('shifts')
        .insert(shifts);

      if (insertError) throw insertError;

      toast.success("Regular shifts created successfully");
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