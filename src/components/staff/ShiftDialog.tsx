import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShiftForm } from "./ShiftForm";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
  employee?: any;
}

export function ShiftDialog({ open, onOpenChange, initialData, employee }: ShiftDialogProps) {
  const queryClient = useQueryClient();

  const handleSubmit = async (data: any) => {
    try {
      if (initialData) {
        const { error } = await supabase
          .from('shifts')
          .update(data)
          .eq('id', initialData.id);

        if (error) throw error;
        toast.success("Shift updated successfully");
      } else {
        const { error } = await supabase
          .from('shifts')
          .insert([data]);

        if (error) throw error;
        toast.success("Shift created successfully");
      }

      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Shift' : 'Create Shift'}
          </DialogTitle>
          <DialogDescription>
            {employee?.name ? `Assign shifts for ${employee.name}` : 'Assign shifts'}
          </DialogDescription>
        </DialogHeader>
        <ShiftForm
          initialData={initialData}
          employee={employee}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}