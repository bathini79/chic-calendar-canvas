import React, { useState, useEffect } from 'react';
import { format, addMonths } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
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
import { Info, Trash2, X, Plus, Clock } from 'lucide-react';
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
      onClose();
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

  // Generate time options for dropdown
  const timeOptions = Array.from({ length: 24 }).map((_, hour) => ({
    value: `${hour.toString().padStart(2, '0')}:00`,
    label: `${hour.toString().padStart(2, '0')}:00`
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl">Set {employee?.name}'s regular shifts</DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            Set weekly, biweekly or custom shifts. Changes saved will apply to all upcoming shifts for the selected period.
          </p>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Left Column - Schedule Settings */}
          <div className="space-y-5">
            <div>
              <Label htmlFor="schedule-type" className="font-medium mb-1.5 block">Schedule type</Label>
              <Select 
                value={scheduleType} 
                onValueChange={setScheduleType}
              >
                <SelectTrigger className="w-full" id="schedule-type">
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
              <Label htmlFor="start-date" className="font-medium mb-1.5 block">Start date</Label>
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
              <Label htmlFor="end-option" className="font-medium mb-1.5 block">Ends</Label>
              <Select value={endOption} onValueChange={setEndOption}>
                <SelectTrigger id="end-option">
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
                <Label htmlFor="end-date" className="font-medium mb-1.5 block">End date</Label>
                <Popover open={openEndDate} onOpenChange={setOpenEndDate}>
                  <PopoverTrigger asChild>
                    <Button
                      id="end-date"
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
            
            <div className="bg-blue-50 p-4 rounded-md flex mt-4">
              <Info className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">Team members will not be scheduled on business closed periods.</p>
            </div>
          </div>
          
          {/* Right Column - Day Shifts */}
          <div className="space-y-5 border-t lg:border-t-0 pt-4 lg:pt-0">
            <h3 className="font-medium text-sm text-gray-500 mb-2 lg:hidden">Weekly Schedule</h3>
            
            {days.map(({ day, value }) => (
              <div key={value} className={`p-3 rounded-lg transition-colors ${dayShifts[value].enabled ? 'bg-gray-50' : ''}`}>
                <div className="flex items-center">
                  <Checkbox
                    id={`day-${value}`}
                    checked={dayShifts[value].enabled}
                    onCheckedChange={() => toggleDayEnabled(value)}
                    className="mr-3"
                  />
                  <Label htmlFor={`day-${value}`} className="font-medium cursor-pointer flex-1">
                    {day}
                  </Label>
                  {!dayShifts[value].enabled && (
                    <span className="text-gray-400 text-sm">No shifts</span>
                  )}
                </div>
                
                {dayShifts[value].enabled && (
                  <div className="mt-3 space-y-3">
                    {dayShifts[value].shifts.map((shift, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="h-5 w-5 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-gray-400" />
                        </div>
                        <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-5">
                            <Select
                              value={shift.start}
                              onValueChange={(val) => updateShiftTime(value, index, 'start', val)}
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {timeOptions.map((time) => (
                                  <SelectItem key={time.value} value={time.value}>
                                    {time.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2 text-center text-gray-400">to</div>
                          <div className="col-span-5">
                            <Select
                              value={shift.end}
                              onValueChange={(val) => updateShiftTime(value, index, 'end', val)}
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {timeOptions.map((time) => (
                                  <SelectItem key={time.value} value={time.value}>
                                    {time.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeShift(value, index)}
                          disabled={dayShifts[value].shifts.length === 1}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 text-xs"
                      onClick={() => addShift(value)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add another shift
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <DialogFooter className="mt-8 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="mr-2">
            Cancel
          </Button>
          <Button 
            variant="default"
            onClick={handleSave}
          >
            Save shifts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}