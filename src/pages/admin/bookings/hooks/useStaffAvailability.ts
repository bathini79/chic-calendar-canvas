import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, isSameDay, addMinutes } from 'date-fns';

interface StaffAvailabilityProps {
  selectedDate?: Date;
  selectedTime?: string;
  locationId?: string;
  serviceDuration?: number;
}

export function useStaffAvailability({
  selectedDate,
  selectedTime,
  locationId,
  serviceDuration = 60, // Default to 60 mins if not specified
}: StaffAvailabilityProps) {
  const [availableStylists, setAvailableStylists] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStaffAvailability = async () => {
      if (!selectedDate || !selectedTime || !locationId) {
        setAvailableStylists([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 1. Get all stylists for this location
        const { data: employees, error: employeeError } = await supabase
          .from('employees')
          .select(`
            *,
            employee_locations!inner(location_id)
          `)
          .eq('employment_type', 'stylist')
          .eq('status', 'active')
          .eq('employee_locations.location_id', locationId);

        if (employeeError) throw employeeError;
        
        if (!employees || employees.length === 0) {
          setAvailableStylists([]);
          setIsLoading(false);
          return;
        }

        // Start and end time for the appointment
        const appointmentStart = new Date(selectedDate);
        const [hours, minutes] = selectedTime.split(':').map(Number);
        appointmentStart.setHours(hours, minutes, 0, 0);
        
        const appointmentEnd = addMinutes(appointmentStart, serviceDuration);
        
        // 2. Get recurring shifts for this day of week
        const dayOfWeek = selectedDate.getDay();
        const { data: recurringShifts, error: shiftError } = await supabase
          .from('recurring_shifts')
          .select('*')
          .in('employee_id', employees.map(e => e.id))
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
          .select('*')
          .in('employee_id', employees.map(e => e.id))
          .gte('start_time', todayStart.toISOString())
          .lte('end_time', todayEnd.toISOString())
          .eq('location_id', locationId);
        
        if (specificShiftError) throw specificShiftError;

        // 4. Get time off requests for this date
        const dateStr = selectedDate.toISOString().split('T')[0];
        const { data: timeOff, error: timeOffError } = await supabase
          .from('time_off_requests')
          .select('*')
          .in('employee_id', employees.map(e => e.id))
          .lte('start_date', dateStr)
          .gte('end_date', dateStr)
          .eq('status', 'approved');
        
        if (timeOffError) throw timeOffError;

        // 5. Get existing bookings for this date
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('*')
          .in('employee_id', employees.map(e => e.id))
          .gte('start_time', todayStart.toISOString())
          .lte('end_time', todayEnd.toISOString());
        
        if (bookingsError) throw bookingsError;

        // Find available stylists
        const available = employees.filter(employee => {
          // Check if employee has time off
          const hasTimeOff = timeOff?.some(t => t.employee_id === employee.id);
          if (hasTimeOff) return false;

          // Check if there's a specific shift for today
          const employeeSpecificShifts = specificShifts?.filter(s => s.employee_id === employee.id) || [];
          
          // Check if there's a recurring shift
          const employeeRecurringShifts = recurringShifts?.filter(s => s.employee_id === employee.id) || [];
          
          // If no shifts found at all, employee is not working
          if (employeeSpecificShifts.length === 0 && employeeRecurringShifts.length === 0) {
            return false;
          }

          // If specific shifts exist, they override recurring shifts
          const shiftsToCheck = employeeSpecificShifts.length > 0 
            ? employeeSpecificShifts 
            : employeeRecurringShifts;

          // Check if appointment time falls within any shift
          const isWorkingDuringAppointment = shiftsToCheck.some(shift => {
            let shiftStart, shiftEnd;
            
            if ('start_time' in shift && typeof shift.start_time === 'string' && shift.start_time.includes('T')) {
              // Specific shift with datetime
              shiftStart = new Date(shift.start_time);
              shiftEnd = new Date(shift.end_time);
            } else {
              // Recurring shift with just time strings
              shiftStart = new Date(selectedDate);
              shiftEnd = new Date(selectedDate);
              
              const [startHour, startMinute] = (shift.start_time as string).split(':').map(Number);
              const [endHour, endMinute] = (shift.end_time as string).split(':').map(Number);
              
              shiftStart.setHours(startHour, startMinute, 0, 0);
              shiftEnd.setHours(endHour, endMinute, 0, 0);
            }
            
            // Fix: The appointment is within the shift if:
            // 1. The appointment start time is >= shift start time AND
            // 2. The appointment end time <= shift end time
            return (appointmentStart >= shiftStart && appointmentEnd <= shiftEnd);
          });

          if (!isWorkingDuringAppointment) return false;

          // Check for conflicting bookings
          const hasConflictingBooking = bookings?.some(booking => {
            if (booking.employee_id !== employee.id) return false;
            
            const bookingStart = new Date(booking.start_time);
            const bookingEnd = new Date(booking.end_time);
            
            // Check for overlap
            return (
              (appointmentStart < bookingEnd && appointmentEnd > bookingStart)
            );
          });

          return !hasConflictingBooking;
        });

        setAvailableStylists(available.map(e => e.id));
      } catch (err) {
        console.error('Error fetching staff availability:', err);
        setError('Failed to check staff availability');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaffAvailability();
  }, [selectedDate, selectedTime, locationId, serviceDuration]);

  return {
    availableStylists,
    isLoading,
    error
  };
}