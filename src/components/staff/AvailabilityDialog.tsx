import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface AvailabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
}

type DayAvailability = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type FormValues = {
  availability: DayAvailability[];
};

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday',
  'Friday', 'Saturday', 'Sunday'
];

export function AvailabilityDialog({ 
  open, 
  onOpenChange, 
  employeeId 
}: AvailabilityDialogProps) {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    defaultValues: {
      availability: DAYS_OF_WEEK.map((_, index) => ({
        day_of_week: index + 1,
        start_time: '09:00',
        end_time: '17:00',
      })),
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      // Delete existing availability
      const { error: deleteError } = await supabase
        .from('employee_availability')
        .delete()
        .eq('employee_id', employeeId);

      if (deleteError) throw deleteError;

      // Insert new availability
      const { error: insertError } = await supabase
        .from('employee_availability')
        .insert(
          data.availability.map(day => ({
            employee_id: employeeId,
            ...day,
          }))
        );

      if (insertError) throw insertError;

      toast.success("Availability updated successfully");
      queryClient.invalidateQueries({ queryKey: ['employee_availability'] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Set Employee Availability</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <div className="p-6 pt-0">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {DAYS_OF_WEEK.map((day, index) => (
                  <div key={day} className="grid grid-cols-3 gap-4 items-center">
                    <div className="font-medium">{day}</div>
                    <FormField
                      control={form.control}
                      name={`availability.${index}.start_time`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <Input type="time" {...field} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`availability.${index}.end_time`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <Input type="time" {...field} />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Save Availability</Button>
                </div>
              </form>
            </Form>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}