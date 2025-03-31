
import React, { useState, useEffect } from 'react';
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AddTimeOffDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employees: any[];
  selectedEmployee: any;
}

export function AddTimeOffDialog({
  isOpen,
  onClose,
  employees,
  selectedEmployee
}: AddTimeOffDialogProps) {
  const [employeeId, setEmployeeId] = useState(selectedEmployee?.id || '');
  const [timeOffType, setTimeOffType] = useState('Annual leave');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [openStartDate, setOpenStartDate] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [openEndDate, setOpenEndDate] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [description, setDescription] = useState('');
  const [isApproved, setIsApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      setIsLoading(true);
      // Validate inputs
      if (!employeeId) {
        toast({
          title: "Error",
          description: "Please select an employee",
          variant: "destructive",
        });
        return;
      }
      
      // Ensure end date is not before start date
      if (endDate < startDate) {
        toast({
          title: "Error",
          description: "End date cannot be before start date",
          variant: "destructive",
        });
        return;
      }
      
      // Create time off request
      const { error } = await supabase.from('time_off_requests').insert({
        employee_id: employeeId,
        reason: timeOffType,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: isApproved ? 'approved' : 'pending',
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Time off request has been created",
      });
      
      onClose();
    } catch (error) {
      console.error('Error creating time off request:', error);
      toast({
        title: "Error",
        description: "Failed to create time off request",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add time off</DialogTitle>
          <Button variant="ghost" className="absolute right-4 top-4" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="employee">Team member</Label>
            <Select 
              value={employeeId} 
              onValueChange={setEmployeeId}
            >
              <SelectTrigger className="border-2 focus:border-blue-500">
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
            <Label htmlFor="type">Type</Label>
            <Select 
              value={timeOffType} 
              onValueChange={setTimeOffType}
            >
              <SelectTrigger className="border-2 focus:border-blue-500">
                <SelectValue placeholder="Select time off type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Annual leave">Annual leave</SelectItem>
                <SelectItem value="Sick leave">Sick leave</SelectItem>
                <SelectItem value="Personal leave">Personal leave</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">Start date</Label>
              <Popover open={openStartDate} onOpenChange={setOpenStartDate}>
                <PopoverTrigger asChild>
                  <Button
                    id="start-date"
                    variant="outline"
                    className="w-full justify-start text-left font-normal border-2 focus:border-blue-500"
                  >
                    {startDate ? format(startDate, "PPP") : "Select start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date || new Date());
                      setOpenStartDate(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label htmlFor="start-time">Start time</Label>
              <Select 
                value={startTime} 
                onValueChange={setStartTime}
              >
                <SelectTrigger className="border-2 focus:border-blue-500">
                  <SelectValue placeholder="Select start time" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <SelectItem key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                      {hour.toString().padStart(2, '0')}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="end-date">End date</Label>
              <Popover open={openEndDate} onOpenChange={setOpenEndDate}>
                <PopoverTrigger asChild>
                  <Button
                    id="end-date"
                    variant="outline"
                    className="w-full justify-start text-left font-normal border-2 focus:border-blue-500"
                  >
                    {endDate ? format(endDate, "PPP") : "Select end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      setEndDate(date || new Date());
                      setOpenEndDate(false);
                    }}
                    initialFocus
                    disabled={(date) => date < startDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label htmlFor="end-time">End time</Label>
              <Select 
                value={endTime} 
                onValueChange={setEndTime}
              >
                <SelectTrigger className="border-2 focus:border-blue-500">
                  <SelectValue placeholder="Select end time" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <SelectItem key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                      {hour.toString().padStart(2, '0')}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="repeat" 
              checked={isRepeat} 
              onCheckedChange={(checked) => setIsRepeat(checked === true)}
            />
            <Label htmlFor="repeat">Repeat</Label>
          </div>
          
          <div>
            <Label htmlFor="description" className="flex justify-between">
              Description
              <span className="text-xs text-gray-500">{description.length}/100</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Add description or note (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100}
              className="border-2 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="approved" 
              checked={isApproved} 
              onCheckedChange={(checked) => setIsApproved(checked === true)}
            />
            <Label htmlFor="approved">Approved</Label>
          </div>
          
          <p className="text-sm text-gray-500">
            Online bookings cannot be placed during time off.
          </p>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
