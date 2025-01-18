import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { addWeeks, format, startOfWeek } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface RegularShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: any;
}

const DAYS = [
  { label: "Monday", value: "1" },
  { label: "Tuesday", value: "2" },
  { label: "Wednesday", value: "3" },
  { label: "Thursday", value: "4" },
  { label: "Friday", value: "5" },
  { label: "Saturday", value: "6" },
  { label: "Sunday", value: "0" },
];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

export function RegularShiftDialog({ open, onOpenChange, employee }: RegularShiftDialogProps) {
  const queryClient = useQueryClient();
  const [duration, setDuration] = useState("1");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("19:00");

  const handleSubmit = async () => {
    try {
      const startDate = startOfWeek(new Date());
      const endDate = addWeeks(startDate, parseInt(duration));
      const shifts = [];

      for (let date = startDate; date <= endDate; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay().toString();
        if (selectedDays.includes(dayOfWeek)) {
          const [startHour] = startTime.split(':');
          const [endHour] = endTime.split(':');
          
          const shiftStart = new Date(date);
          shiftStart.setHours(parseInt(startHour), 0, 0);
          
          const shiftEnd = new Date(date);
          shiftEnd.setHours(parseInt(endHour), 0, 0);

          shifts.push({
            employee_id: employee.id,
            start_time: shiftStart.toISOString(),
            end_time: shiftEnd.toISOString(),
            status: 'pending'
          });
        }
      }

      const { error } = await supabase
        .from('shifts')
        .insert(shifts);

      if (error) throw error;

      toast.success("Regular shifts created successfully");
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Set {employee?.name}'s regular shifts</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Schedule type</label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 week</SelectItem>
                <SelectItem value="2">2 weeks</SelectItem>
                <SelectItem value="3">3 weeks</SelectItem>
                <SelectItem value="4">4 weeks</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Working days</label>
            <div className="grid grid-cols-2 gap-2">
              {DAYS.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={day.value}
                    checked={selectedDays.includes(day.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedDays([...selectedDays, day.value]);
                      } else {
                        setSelectedDays(selectedDays.filter(d => d !== day.value));
                      }
                    }}
                  />
                  <label htmlFor={day.value} className="text-sm">
                    {day.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start time</label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {format(new Date().setHours(parseInt(time)), 'h:mm a')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">End time</label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {format(new Date().setHours(parseInt(time)), 'h:mm a')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}