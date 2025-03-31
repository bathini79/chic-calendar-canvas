
import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SetRegularShiftsDialogProps {
  isOpen: boolean;
  onClose: (saved?: boolean) => void;
  employee: any;
  onSave: () => void;
  locationId?: string;
}

export function SetRegularShiftsDialog({ 
  isOpen, 
  onClose,
  employee,
  onSave,
  locationId = ''
}: SetRegularShiftsDialogProps) {
  // Day of week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysOfWeek = [
    { id: 1, name: "Monday" },
    { id: 2, name: "Tuesday" },
    { id: 3, name: "Wednesday" },
    { id: 4, name: "Thursday" },
    { id: 5, name: "Friday" },
    { id: 6, name: "Saturday" },
    { id: 0, name: "Sunday" }
  ];

  const timeOptions = Array.from({ length: 24 * 4 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    const period = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour % 12 || 12; // Convert 0 to 12 for 12 AM
    return {
      value: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      label: `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
    };
  });

  const [shifts, setShifts] = useState<Record<number, { enabled: boolean, startTime: string, endTime: string }>>({
    0: { enabled: false, startTime: '09:00', endTime: '17:00' }, // Sunday
    1: { enabled: false, startTime: '09:00', endTime: '17:00' }, // Monday
    2: { enabled: false, startTime: '09:00', endTime: '17:00' }, // Tuesday
    3: { enabled: false, startTime: '09:00', endTime: '17:00' }, // Wednesday
    4: { enabled: false, startTime: '09:00', endTime: '17:00' }, // Thursday
    5: { enabled: false, startTime: '09:00', endTime: '17:00' }, // Friday
    6: { enabled: false, startTime: '09:00', endTime: '17:00' }  // Saturday
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleDayToggle = (dayId: number, enabled: boolean) => {
    setShifts(prev => ({
      ...prev,
      [dayId]: { ...prev[dayId], enabled }
    }));
  };

  const handleTimeChange = (dayId: number, field: 'startTime' | 'endTime', time: string) => {
    setShifts(prev => ({
      ...prev,
      [dayId]: { ...prev[dayId], [field]: time }
    }));
  };

  // Fetch existing recurring shifts
  useEffect(() => {
    const fetchShifts = async () => {
      try {
        let query = supabase
          .from('recurring_shifts')
          .select('*')
          .eq('employee_id', employee.id);
        
        if (locationId) {
          query = query.eq('location_id', locationId);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        const newShifts = { ...shifts };
        
        (data || []).forEach(shift => {
          const dayOfWeek = shift.day_of_week;
          newShifts[dayOfWeek] = {
            enabled: true,
            startTime: shift.start_time,
            endTime: shift.end_time
          };
        });
        
        setShifts(newShifts);
      } catch (error) {
        console.error('Error fetching recurring shifts:', error);
        toast({
          title: 'Error',
          description: 'Failed to load existing shifts.',
          variant: 'destructive'
        });
      }
    };
    
    if (isOpen && employee?.id) {
      fetchShifts();
    }
  }, [isOpen, employee?.id, locationId]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // 1. Delete all current recurring shifts for this employee at this location
      let deleteQuery = supabase
        .from('recurring_shifts')
        .delete()
        .eq('employee_id', employee.id);
      
      if (locationId) {
        deleteQuery = deleteQuery.eq('location_id', locationId);
      }
      
      const { error: deleteError } = await deleteQuery;
      
      if (deleteError) throw deleteError;
      
      // 2. Add new shifts
      const shiftsToAdd = Object.entries(shifts)
        .filter(([_, shift]) => shift.enabled)
        .map(([day, shift]) => ({
          employee_id: employee.id,
          day_of_week: parseInt(day),
          start_time: shift.startTime,
          end_time: shift.endTime,
          location_id: locationId || null,
          effective_from: new Date().toISOString().split('T')[0] // Today
        }));
      
      if (shiftsToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('recurring_shifts')
          .insert(shiftsToAdd);
        
        if (insertError) throw insertError;
      }
      
      toast({
        title: 'Success',
        description: 'Regular shifts have been updated.',
      });
      
      onSave();
      onClose(true);
    } catch (error) {
      console.error('Error saving shifts:', error);
      toast({
        title: 'Error',
        description: 'Failed to save shifts.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Set regular shifts for {employee?.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Working</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {daysOfWeek.map(day => (
                <TableRow key={day.id}>
                  <TableCell className="font-medium">{day.name}</TableCell>
                  <TableCell>
                    <Switch
                      checked={shifts[day.id]?.enabled}
                      onCheckedChange={(checked) => handleDayToggle(day.id, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      disabled={!shifts[day.id]?.enabled}
                      value={shifts[day.id]?.startTime}
                      onValueChange={(value) => handleTimeChange(day.id, 'startTime', value)}
                    >
                      <SelectTrigger className="w-[110px]">
                        <SelectValue placeholder="Start time" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map(option => (
                          <SelectItem key={`start-${day.id}-${option.value}`} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      disabled={!shifts[day.id]?.enabled}
                      value={shifts[day.id]?.endTime}
                      onValueChange={(value) => handleTimeChange(day.id, 'endTime', value)}
                    >
                      <SelectTrigger className="w-[110px]">
                        <SelectValue placeholder="End time" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map(option => (
                          <SelectItem key={`end-${day.id}-${option.value}`} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
