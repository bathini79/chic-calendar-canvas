
import React, { useState, useEffect } from 'react';
import { format, addMonths } from 'date-fns';
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info, Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SetRegularShiftsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
  onSave: () => void;
}

export function SetRegularShiftsDialog({
  isOpen,
  onClose,
  employee,
  onSave
}: SetRegularShiftsDialogProps) {
  const [scheduleType, setScheduleType] = useState("weekly");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endOption, setEndOption] = useState("never");
  const [endDate, setEndDate] = useState<Date | undefined>(addMonths(new Date(), 6));
  const [openStartDate, setOpenStartDate] = useState(false);
  const [openEndDate, setOpenEndDate] = useState(false);
  
  const [dayShifts, setDayShifts] = useState<Record<number, { enabled: boolean, shifts: { start: string, end: string }[] }>>({
    0: { enabled: false, shifts: [] }, // Sunday
    1: { enabled: true, shifts: [{ start: '10:00', end: '19:00' }] }, // Monday
    2: { enabled: true, shifts: [{ start: '10:00', end: '19:00' }] }, // Tuesday
    3: { enabled: true, shifts: [{ start: '10:00', end: '19:00' }] }, // Wednesday
    4: { enabled: true, shifts: [{ start: '10:00', end: '19:00' }] }, // Thursday
    5: { enabled: true, shifts: [{ start: '10:00', end: '19:00' }] }, // Friday
    6: { enabled: false, shifts: [] }, // Saturday
  });
  
  const { toast } = useToast();
  
  // Fetch existing recurring shifts for the employee
  useEffect(() => {
    const fetchRecurringShifts = async () => {
      try {
        const { data, error } = await supabase
          .from('recurring_shifts')
          .select('*')
          .eq('employee_id', employee.id);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Convert existing shifts to our state format
          const newDayShifts = { ...dayShifts };
          
          data.forEach(shift => {
            const dayOfWeek = shift.day_of_week;
            if (!newDayShifts[dayOfWeek]) {
              newDayShifts[dayOfWeek] = { enabled: true, shifts: [] };
            }
            
            newDayShifts[dayOfWeek].enabled = true;
            newDayShifts[dayOfWeek].shifts.push({
              start: shift.start_time,
              end: shift.end_time
            });
          });
          
          setDayShifts(newDayShifts);
          setStartDate(new Date(data[0].effective_from));
          
          // Set end date if available
          if (data[0].effective_until) {
            setEndOption('date');
            setEndDate(new Date(data[0].effective_until));
          }
        }
      } catch (error) {
        console.error('Error fetching recurring shifts:', error);
      }
    };
    
    if (employee) {
      fetchRecurringShifts();
    }
  }, [employee]);

  const toggleDayEnabled = (day: number) => {
    setDayShifts(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
        shifts: prev[day].enabled 
          ? [] 
          : [{ start: '10:00', end: '19:00' }]
      }
    }));
  };

  const addShift = (day: number) => {
    setDayShifts(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        shifts: [...prev[day].shifts, { start: '10:00', end: '19:00' }]
      }
    }));
  };

  const removeShift = (day: number, index: number) => {
    setDayShifts(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        shifts: prev[day].shifts.filter((_, i) => i !== index)
      }
    }));
  };

  const updateShiftTime = (day: number, index: number, field: 'start' | 'end', value: string) => {
    setDayShifts(prev => {
      const updatedShifts = [...prev[day].shifts];
      updatedShifts[index] = {
        ...updatedShifts[index],
        [field]: value
      };
      
      return {
        ...prev,
        [day]: {
          ...prev[day],
          shifts: updatedShifts
        }
      };
    });
  };

  const handleSave = async () => {
    try {
      // Delete existing recurring shifts for this employee
      const { error: deleteError } = await supabase
        .from('recurring_shifts')
        .delete()
        .eq('employee_id', employee.id);
        
      if (deleteError) throw deleteError;
      
      // Prepare data for batch insert
      const shiftsToInsert = [];
      
      for (const [day, dayData] of Object.entries(dayShifts)) {
        if (dayData.enabled && dayData.shifts.length > 0) {
          for (const shift of dayData.shifts) {
            shiftsToInsert.push({
              employee_id: employee.id,
              day_of_week: parseInt(day),
              start_time: shift.start,
              end_time: shift.end,
              effective_from: startDate.toISOString().split('T')[0], // Date only
              effective_until: endOption === 'date' && endDate 
                ? endDate.toISOString().split('T')[0] 
                : null
            });
          }
        }
      }
      
      // Insert new shifts
      if (shiftsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('recurring_shifts')
          .insert(shiftsToInsert);
          
        if (insertError) throw insertError;
      }
      
      toast({
        title: "Success",
        description: "Regular shifts have been saved",
      });
      
      onSave();
    } catch (error) {
      console.error('Error saving recurring shifts:', error);
      toast({
        title: "Error",
        description: "Failed to save regular shifts",
        variant: "destructive",
      });
    }
  };

  // Days array for rendering
  const days = [
    { day: "Sunday", value: 0 },
    { day: "Monday", value: 1 },
    { day: "Tuesday", value: 2 },
    { day: "Wednesday", value: 3 },
    { day: "Thursday", value: 4 },
    { day: "Friday", value: 5 },
    { day: "Saturday", value: 6 },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set {employee?.name}'s regular shifts</DialogTitle>
          <Button variant="ghost" className="absolute right-4 top-4" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="mt-2 text-sm text-gray-500">
          Set weekly, biweekly or custom shifts. Changes saved will apply to all upcoming shifts for the selected period.
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="schedule-type">Schedule type</Label>
              <Select 
                value={scheduleType} 
                onValueChange={setScheduleType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select schedule type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Every week</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="start-date">Start date</Label>
              <Popover open={openStartDate} onOpenChange={setOpenStartDate}>
                <PopoverTrigger asChild>
                  <Button
                    id="start-date"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
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
              <Label htmlFor="end-option">Ends</Label>
              <Select value={endOption} onValueChange={setEndOption}>
                <SelectTrigger>
                  <SelectValue placeholder="Select end option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never</SelectItem>
                  <SelectItem value="date">On date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {endOption === 'date' && (
              <div>
                <Popover open={openEndDate} onOpenChange={setOpenEndDate}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {endDate ? format(endDate, "PPP") : "Select end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date);
                        setOpenEndDate(false);
                      }}
                      initialFocus
                      disabled={(date) => date < startDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
            
            <div className="bg-blue-50 p-3 rounded-md flex">
              <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
              <p className="text-xs">Team members will not be scheduled on business closed periods.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {days.map(({ day, value }) => (
              <div key={value} className="space-y-2">
                <div className="flex items-center">
                  <Checkbox
                    id={`day-${value}`}
                    checked={dayShifts[value].enabled}
                    onCheckedChange={() => toggleDayEnabled(value)}
                    className="mr-2"
                  />
                  <Label htmlFor={`day-${value}`} className="font-medium">
                    {day}
                  </Label>
                  <div className="ml-auto">
                    {!dayShifts[value].enabled && (
                      <span className="text-gray-500 text-sm">No shifts</span>
                    )}
                  </div>
                </div>
                
                {dayShifts[value].enabled && (
                  <div className="ml-6 space-y-2">
                    {dayShifts[value].shifts.map((shift, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          <Select
                            value={shift.start}
                            onValueChange={(val) => updateShiftTime(value, index, 'start', val)}
                          >
                            <SelectTrigger>
                              <SelectValue />
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
                        <div className="col-span-1 text-center">-</div>
                        <div className="col-span-5">
                          <Select
                            value={shift.end}
                            onValueChange={(val) => updateShiftTime(value, index, 'end', val)}
                          >
                            <SelectTrigger>
                              <SelectValue />
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
                        <div className="col-span-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeShift(value, index)}
                            disabled={dayShifts[value].shifts.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="ml-0"
                      onClick={() => addShift(value)}
                    >
                      Add a shift
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button 
            variant="default" 
            onClick={handleSave}
            className="ml-2"
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
