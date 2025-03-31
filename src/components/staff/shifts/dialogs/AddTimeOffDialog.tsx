
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
import { Input } from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AddTimeOffDialogProps {
  isOpen: boolean;
  onClose: (saved?: boolean) => void;
  selectedEmployee?: any;
  employees: any[];
  locations?: any[];
  selectedLocation?: string;
}

export function AddTimeOffDialog({
  isOpen,
  onClose,
  selectedEmployee,
  employees,
  locations = [],
  selectedLocation = ''
}: AddTimeOffDialogProps) {
  const [employeeId, setEmployeeId] = useState(selectedEmployee?.id || '');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [reason, setReason] = useState('');
  const [openStartDate, setOpenStartDate] = useState(false);
  const [openEndDate, setOpenEndDate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [locationId, setLocationId] = useState(selectedLocation);
  
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
      
      if (!startDate || !endDate) {
        toast({
          title: "Error",
          description: "Please select both start and end date",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }
      
      if (endDate < startDate) {
        toast({
          title: "Error",
          description: "End date must be after or equal to start date",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }
      
      // Format dates for database (YYYY-MM-DD)
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      // Save to database
      const { data, error } = await supabase.from('time_off_requests').insert({
        employee_id: employeeId,
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        reason: reason || 'Time Off',
        status: 'pending',
        location_id: locationId || null
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Time off request has been submitted",
      });
      
      onClose(true); // Pass true to indicate data was changed
    } catch (error) {
      console.error('Error adding time off request:', error);
      toast({
        title: "Error",
        description: "Failed to submit time off request",
        variant: "destructive",
      });
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add time off</DialogTitle>
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
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Vacation, Sick leave, etc."
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">Start date</Label>
              <Popover open={openStartDate} onOpenChange={setOpenStartDate}>
                <PopoverTrigger asChild>
                  <Button
                    id="start-date"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    {startDate ? format(startDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      if (date) {
                        setStartDate(date);
                        if (date > endDate) {
                          setEndDate(date);
                        }
                      }
                      setOpenStartDate(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label htmlFor="end-date">End date</Label>
              <Popover open={openEndDate} onOpenChange={setOpenEndDate}>
                <PopoverTrigger asChild>
                  <Button
                    id="end-date"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    {endDate ? format(endDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      if (date) {
                        setEndDate(date);
                      }
                      setOpenEndDate(false);
                    }}
                    disabled={(date) => date < startDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
