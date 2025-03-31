
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
import { Label } from "@/components/ui/label";
import { Info, Trash2, Plus } from 'lucide-react';
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
  locationId
}: SetRegularShiftsDialogProps) {
  const [scheduleType, setScheduleType] = useState("weekly");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endOption, setEndOption] = useState("never");
  const [endDate, setEndDate] = useState<Date | undefined>(addMonths(new Date(), 6));
  const [openStartDate, setOpenStartDate] = useState(false);
  const [openEndDate, setOpenEndDate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
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
  
  // Format time for display (12-hour format with AM/PM)
  const formatTimeAMPM = (timeString: string) => {
    if (!timeString) return '';
    
    const [hourStr, minuteStr] = timeString.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = minuteStr || '00';
    
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12; // Convert 0 to 12 for 12 AM
    
    return `${displayHour}:${minute} ${period}`;
  };
  
  // Fetch existing recurring shifts for the employee
  useEffect(() => {
    const fetchRecurringShifts = async () => {
      try {
        const query = supabase
          .from('recurring_shifts')
          .select('*')
          .eq('employee_id', employee.id);
          
        // Add location filter if specified
        if (locationId && locationId !== 'all') {
          query.eq('location_id', locationId);
        }
          
        const { data, error } = await query;
        
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
    
    if (employee && isOpen) {
      fetchRecurringShifts();
    }
  }, [employee, isOpen, locationId]);

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
      setIsSaving(true);
      
      if (!locationId || locationId === 'all') {
        toast({
          title: "Error",
          description: "Please select a location for the shifts.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }
      
      // Delete existing recurring shifts for this employee at this location
      const { error: deleteError } = await supabase
        .from('recurring_shifts')
        .delete()
        .eq('employee_id', employee.id)
        .eq('location_id', locationId);
        
      if (deleteError) throw deleteError;
      
      // Prepare data for batch insert
      const shiftsToInsert = [];
      
      for (const [day, dayData] of Object.entries(dayShifts)) {
        if (dayData.enabled && dayData.shifts.length > 0) {
          for (const shift of dayData.shifts) {
            shiftsToInsert.push({
              employee_id: employee.id,
              location_id: locationId,
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
      onClose(true); // Pass true to indicate data was changed
    } catch (error) {
      console.error('Error saving recurring shifts:', error);
      toast({
        title: "Error",
        description: "Failed to save regular shifts",
        variant: "destructive",
      });
      setIsSaving(false);
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
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">Set {employee?.name}'s regular shifts</DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            Set weekly, biweekly or custom shifts for the selected period.
          </p>
        </DialogHeader>
        
        <div className="mt-6 space-y-6">
          {/* Desktop: Two-column layout, Mobile: Single column layout */}
          <div className="flex flex-col md:flex-row md:space-x-6">
            {/* Column 1: Schedule Settings */}
            <div className="md:w-2/5 space-y-4">
              <div>
                <Label htmlFor="schedule-type" className="text-sm font-medium">Schedule type</Label>
                <Select value={scheduleType} onValueChange={setScheduleType}>
                  <SelectTrigger id="schedule-type" className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Every week</SelectItem>
                    <SelectItem value="biweekly">Biweekly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="start-date" className="text-sm font-medium">Start date</Label>
                <Popover open={openStartDate} onOpenChange={setOpenStartDate}>
                  <PopoverTrigger asChild>
                    <Button
                      id="start-date"
                      variant="outline"
                      className="w-full mt-1 justify-start text-left font-normal"
                    >
                      {startDate ? format(startDate, "MMM d, yyyy") : "Select date"}
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
                <Label htmlFor="end-option" className="text-sm font-medium">Ends</Label>
                <Select value={endOption} onValueChange={setEndOption}>
                  <SelectTrigger id="end-option" className="mt-1">
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
                  <Label htmlFor="end-date" className="text-sm font-medium">End date</Label>
                  <Popover open={openEndDate} onOpenChange={setOpenEndDate}>
                    <PopoverTrigger asChild>
                      <Button
                        id="end-date"
                        variant="outline"
                        className="w-full mt-1 justify-start text-left font-normal"
                      >
                        {endDate ? format(endDate, "MMM d, yyyy") : "Select date"}
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
              
              <div className="bg-blue-50 p-3 rounded flex items-start text-xs">
                <Info className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-blue-700">Team members will not be scheduled on business closed periods.</p>
              </div>
            </div>
            
            {/* Divider for desktop view */}
            <div className="hidden md:block w-px bg-gray-200 mx-2"></div>
            
            {/* Column 2: Weekly Schedule */}
            <div className="md:w-3/5 pt-6 md:pt-0">
              <div className="space-y-1.5">
                {days.map(({ day, value }) => (
                  <div key={value} className="py-2.5">
                    <div className="flex items-center">
                      <Checkbox
                        id={`day-${value}`}
                        checked={dayShifts[value].enabled}
                        onCheckedChange={() => toggleDayEnabled(value)}
                        className="mr-2.5"
                      />
                      <Label htmlFor={`day-${value}`} className="text-sm font-medium cursor-pointer flex-1">
                        {day}
                      </Label>
                      {!dayShifts[value].enabled && (
                        <span className="text-gray-400 text-xs">No shifts</span>
                      )}
                    </div>
                    
                    {dayShifts[value].enabled && (
                      <div className="mt-2 pl-6 space-y-2">
                        {dayShifts[value].shifts.map((shift, index) => (
                          <div key={index} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-5">
                              <Select
                                value={shift.start}
                                onValueChange={(val) => updateShiftTime(value, index, 'start', val)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue>{formatTimeAMPM(shift.start)}</SelectValue>
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
                            <div className="col-span-1 text-center text-gray-400 text-xs">-</div>
                            <div className="col-span-5">
                              <Select
                                value={shift.end}
                                onValueChange={(val) => updateShiftTime(value, index, 'end', val)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue>{formatTimeAMPM(shift.end)}</SelectValue>
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
                            <div className="col-span-1 flex justify-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeShift(value, index)}
                                disabled={dayShifts[value].shifts.length === 1}
                                className="h-6 w-6 text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 -ml-2.5"
                          onClick={() => addShift(value)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add shift
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="mt-6 pt-4 border-t gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onClose()} size="sm">
            Cancel
          </Button>
          <Button 
            variant="default"
            onClick={handleSave}
            size="sm"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save shifts'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
