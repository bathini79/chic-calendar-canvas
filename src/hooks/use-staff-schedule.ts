import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseStaffScheduleProps {
  selectedDate: Date;
  locationId?: string;
}

export function useStaffSchedule({
  selectedDate,
  locationId,
}: UseStaffScheduleProps) {
  const [scheduledStaffIds, setScheduledStaffIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStaffSchedule = async () => {
      if (!selectedDate || !locationId) {
        setScheduledStaffIds([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 1. Get all stylists for this location
        const { data: employees, error: employeeError } = await supabase
          .from('employees')
          .select(`
            id,
            employee_locations!inner(location_id)
          `)
          .eq('employment_type', 'stylist')
          .eq('status', 'active')
          .eq('employee_locations.location_id', locationId);

        if (employeeError) throw employeeError;
        
        if (!employees || employees.length === 0) {
          setScheduledStaffIds([]);
          setIsLoading(false);
          return;
        }

        const employeeIds = employees.map(e => e.id);
        
        // 2. Get recurring shifts for this day of week
        const dayOfWeek = selectedDate.getDay();
        const { data: recurringShifts, error: shiftError } = await supabase
          .from('recurring_shifts')
          .select('employee_id')
          .in('employee_id', employeeIds)
          .eq('day_of_week', dayOfWeek)
          .eq('location_id', locationId);
        
        if (shiftError) throw shiftError;

        // 3. Get specific shifts for this date
        const todayStart = new Date(selectedDate);
        todayStart.setHours(0, 0, 0, 0);
        
        const todayEnd = new Date(selectedDate);
        todayEnd.setHours(23, 59, 59, 999);

        const { data: specificShifts, error: specificShiftError } = await supabase
          .from('shifts')
          .select('employee_id')
          .in('employee_id', employeeIds)
          .gte('start_time', todayStart.toISOString())
          .lte('end_time', todayEnd.toISOString())
          .eq('location_id', locationId);
        
        if (specificShiftError) throw specificShiftError;

        // 4. Get time off requests for this date
        const dateStr = selectedDate.toISOString().split('T')[0];
        const { data: timeOff, error: timeOffError } = await supabase
          .from('time_off_requests')
          .select('employee_id')
          .in('employee_id', employeeIds)
          .lte('start_date', dateStr)
          .gte('end_date', dateStr)
          .eq('status', 'approved');
        
        if (timeOffError) throw timeOffError;

        // Combine results to find scheduled staff
        const staffWithRecurringShifts = new Set(recurringShifts?.map(s => s.employee_id) || []);
        const staffWithSpecificShifts = new Set(specificShifts?.map(s => s.employee_id) || []);
        const staffWithTimeOff = new Set(timeOff?.map(t => t.employee_id) || []);
        
        // Staff is scheduled if they have any type of shift and no approved time off
        const scheduledStaff = employeeIds.filter(id => 
          !staffWithTimeOff.has(id) && 
          (staffWithRecurringShifts.has(id) || staffWithSpecificShifts.has(id))
        );
        
        // Add the 'unassigned' pseudo-employee if needed
        setScheduledStaffIds(['unassigned', ...scheduledStaff]);
      } catch (err) {
        console.error('Error fetching staff schedule:', err);
        setError('Failed to check staff schedule');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaffSchedule();
  }, [selectedDate, locationId]);

  return {
    scheduledStaffIds,
    isLoading,
    error
  };
}