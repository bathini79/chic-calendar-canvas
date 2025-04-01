
import React, { useState } from 'react';
import { format, addMinutes } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AddShiftDialogProps {
  isOpen: boolean;
  onClose: (saved?: boolean) => void;
  selectedDate?: Date;
  selectedEmployee?: any;
  employees: any[];
  locations?: any[];
  selectedLocation?: string;
}

export function AddShiftDialog({
  isOpen,
  onClose,
  selectedDate = new Date(),
  selectedEmployee,
  employees,
  selectedLocation = ''
}: AddShiftDialogProps) {
  const [employeeId, setEmployeeId] = useState(selectedEmployee?.id || '');
  const [startHour, setStartHour] = useState("09");
  const [startMinute, setStartMinute] = useState("00");
  const [endHour, setEndHour] = useState("17");
  const [endMinute, setEndMinute] = useState("00");
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Validate inputs
      if (!employeeId) {
        toast({
          title: "Error",
          description: "Please select an employee",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }
      
      // Create Date objects for start and end time
      const shiftDate = new Date(selectedDate);
      
      const startTime = new Date(shiftDate);
      startTime.setHours(parseInt(startHour, 10), parseInt(startMinute, 10), 0, 0);
      
      const endTime = new Date(shiftDate);
      endTime.setHours(parseInt(endHour, 10), parseInt(endMinute, 10), 0, 0);
      
      // Validate times
      if (endTime <= startTime) {
        toast({
          title: "Error",
          description: "End time must be after start time",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }
      
      // Save to database
      const { data, error } = await supabase.from('shifts').insert({
        employee_id: employeeId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        location_id: selectedLocation || null
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Shift has been added",
      });
      
      onClose(true); // Pass true to indicate data was changed
    } catch (error) {
      console.error('Error adding shift:', error);
      toast({
        title: "Error",
        description: "Failed to add shift",
        variant: "destructive",
      });
      setIsSaving(false);
    }
  };

  // Generate time options (hours and minutes)
  const hoursOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return { value: hour, label: hour };
  });
  
  const minutesOptions = Array.from({ length: 4 }, (_, i) => {
    const minute = (i * 15).toString().padStart(2, '0');
    return { value: minute, label: minute };
  });

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add specific shift</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div>
            <Label>Date</Label>
            <div className="border rounded-md px-3 py-2 bg-gray-50">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </div>
          </div>
          
          <div>
            <Label htmlFor="employee">Team member</Label>
            <Select 
              value={employeeId} 
              onValueChange={setEmployeeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Start time</Label>
              <div className="flex space-x-2">
                <Select value={startHour} onValueChange={setStartHour}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hoursOptions.map(option => (
                      <SelectItem key={`start-hour-${option.value}`} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="flex items-center">:</span>
                <Select value={startMinute} onValueChange={setStartMinute}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {minutesOptions.map(option => (
                      <SelectItem key={`start-minute-${option.value}`} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>End time</Label>
              <div className="flex space-x-2">
                <Select value={endHour} onValueChange={setEndHour}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hoursOptions.map(option => (
                      <SelectItem key={`end-hour-${option.value}`} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="flex items-center">:</span>
                <Select value={endMinute} onValueChange={setEndMinute}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {minutesOptions.map(option => (
                      <SelectItem key={`end-minute-${option.value}`} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-2">
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
