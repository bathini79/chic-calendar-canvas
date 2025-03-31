
import React, { useState } from 'react';
import { format } from 'date-fns';
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
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AddShiftDialogProps {
  isOpen: boolean;
  onClose: (saved?: boolean) => void;
  selectedDate: Date;
  selectedEmployee: any;
  employees: any[];
  locations: any[];
  selectedLocation: string;
}

export function AddShiftDialog({
  isOpen,
  onClose,
  selectedDate,
  selectedEmployee,
  employees,
  locations,
  selectedLocation
}: AddShiftDialogProps) {
  const [date, setDate] = useState<Date>(selectedDate);
  const [openDate, setOpenDate] = useState(false);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('19:00');
  const [employeeId, setEmployeeId] = useState(selectedEmployee?.id || '');
  const [locationId, setLocationId] = useState(selectedLocation || (locations.length > 0 ? locations[0].id : ''));
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();

  // Function to format time for display (12-hour format with AM/PM)
  const formatTimeAMPM = (timeString: string) => {
    const [hourStr, minuteStr] = timeString.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = minuteStr || '00';
    
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12; // Convert 0 to 12 for 12 AM
    
    return `${displayHour}:${minute} ${period}`;
  };

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
        return;
      }
      
      if (!locationId) {
        toast({
          title: "Error",
          description: "Please select a location",
          variant: "destructive",
        });
        return;
      }
      
      // Create datetime objects for start and end
      const startDate = new Date(date);
      const [startHour, startMinute] = startTime.split(':').map(Number);
      startDate.setHours(startHour, startMinute, 0, 0);
      
      const endDate = new Date(date);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      endDate.setHours(endHour, endMinute, 0, 0);
      
      // Validate that end time is after start time
      if (endDate <= startDate) {
        toast({
          title: "Error",
          description: "End time must be after start time",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }
      
      // Save to the database
      const { data, error } = await supabase.from('shifts').insert({
        employee_id: employeeId,
        location_id: locationId,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Specific shift has been added",
      });
      
      onClose(true); // Pass true to indicate data has changed
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

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add specific shift</DialogTitle>
          <Button variant="ghost" className="absolute right-4 top-4" onClick={() => onClose()}>
          </Button>
        </DialogHeader>
        
        <div className="space-y-4">
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
          
          <div>
            <Label htmlFor="location">Location</Label>
            <Select 
              value={locationId} 
              onValueChange={setLocationId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="date">Date</Label>
            <Popover open={openDate} onOpenChange={setOpenDate}>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  {date ? format(date, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => {
                    setDate(newDate || new Date());
                    setOpenDate(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-time">Start time</Label>
              <Select 
                value={startTime} 
                onValueChange={setStartTime}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formatTimeAMPM(startTime)} />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <SelectItem key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                      {formatTimeAMPM(`${hour.toString().padStart(2, '0')}:00`)}
                    </SelectItem>
                  ))}
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <SelectItem key={`${hour}-30`} value={`${hour.toString().padStart(2, '0')}:30`}>
                      {formatTimeAMPM(`${hour.toString().padStart(2, '0')}:30`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="end-time">End time</Label>
              <Select 
                value={endTime} 
                onValueChange={setEndTime}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formatTimeAMPM(endTime)} />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <SelectItem key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                      {formatTimeAMPM(`${hour.toString().padStart(2, '0')}:00`)}
                    </SelectItem>
                  ))}
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <SelectItem key={`${hour}-30`} value={`${hour.toString().padStart(2, '0')}:30`}>
                      {formatTimeAMPM(`${hour.toString().padStart(2, '0')}:30`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
