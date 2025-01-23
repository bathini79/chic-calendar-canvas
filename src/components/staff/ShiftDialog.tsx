import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ShiftTimeSelector } from "./ShiftTimeSelector";
import { useState } from "react";

interface ShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: any;
  selectedDate?: Date | null;
  existingShifts?: any[];
}

interface ShiftTime {
  startTime: string;
  endTime: string;
}

export function ShiftDialog({ 
  open, 
  onOpenChange, 
  employee,
  selectedDate,
  existingShifts = []
}: ShiftDialogProps) {
  const queryClient = useQueryClient();
  const [shifts, setShifts] = useState<ShiftTime[]>(
    existingShifts.map(shift => ({
      startTime: format(new Date(shift.start_time), 'HH:mm'),
      endTime: format(new Date(shift.end_time), 'HH:mm')
    })) || []
  );

  const handleAddShift = () => {
    setShifts([...shifts, { startTime: '09:00', endTime: '17:00' }]);
  };

  const handleRemoveShift = (index: number) => {
    setShifts(shifts.filter((_, i) => i !== index));
  };

  const handleStartTimeChange = (index: number, value: string) => {
    const newShifts = [...shifts];
    newShifts[index].startTime = value;
    setShifts(newShifts);
  };

  const handleEndTimeChange = (index: number, value: string) => {
    const newShifts = [...shifts];
    newShifts[index].endTime = value;
    setShifts(newShifts);
  };

  const handleDeleteExistingShift = async (shift: any) => {
    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', shift.id);

      if (error) throw error;
      
      toast.success("Shift deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSave = async () => {
    if (!selectedDate || !employee) return;

    try {
      const shiftsToCreate = shifts.map(shift => {
        const shiftDate = new Date(selectedDate);
        const [startHour, startMinute] = shift.startTime.split(':');
        const [endHour, endMinute] = shift.endTime.split(':');
        
        const startTime = new Date(shiftDate);
        startTime.setHours(parseInt(startHour), parseInt(startMinute), 0);
        
        const endTime = new Date(shiftDate);
        endTime.setHours(parseInt(endHour), parseInt(endMinute), 0);

        return {
          employee_id: employee.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString()
        };
      });

      const { error } = await supabase
        .from('shifts')
        .insert(shiftsToCreate);

      if (error) throw error;

      toast.success("Shifts created successfully");
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const dialogTitle = selectedDate
    ? `${employee?.name}'s shifts for ${format(selectedDate, 'EEE, d MMM')}`
    : 'Update Shifts';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Manage shifts for this day
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {existingShifts && existingShifts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Existing Shifts</h3>
              {existingShifts.map((shift: any) => (
                <div key={shift.id} className="flex items-center gap-2 bg-accent/5 p-2 rounded-md">
                  <span className="flex-1 text-sm">
                    {format(new Date(shift.start_time), 'h:mm a')} - {format(new Date(shift.end_time), 'h:mm a')}
                    {shift.id.toString().startsWith('pattern-') && (
                      <span className="ml-2 text-xs text-muted-foreground">(Recurring)</span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteExistingShift(shift)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-medium">New Shifts</h3>
            {shifts.map((shift, index) => (
              <ShiftTimeSelector
                key={index}
                startTime={shift.startTime}
                endTime={shift.endTime}
                onStartTimeChange={(value) => handleStartTimeChange(index, value)}
                onEndTimeChange={(value) => handleEndTimeChange(index, value)}
                onRemove={() => handleRemoveShift(index)}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleAddShift}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add a shift
          </Button>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}