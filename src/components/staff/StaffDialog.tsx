import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StaffForm } from "./StaffForm";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
}

export function StaffDialog({ open, onOpenChange, initialData }: StaffDialogProps) {
  const queryClient = useQueryClient();

  const handleSubmit = async (data: any) => {
    try {
      if (initialData) {
        // Update employee
        const { error: employeeError } = await supabase
          .from('employees')
          .update({
            name: data.name,
            email: data.email,
            phone: data.phone,
            photo_url: data.photo_url,
            status: data.status,
          })
          .eq('id', initialData.id);
        
        if (employeeError) throw employeeError;

        // Update skills
        if (data.skills && data.skills.length > 0) {
          // First delete existing skills
          const { error: deleteError } = await supabase
            .from('employee_skills')
            .delete()
            .eq('employee_id', initialData.id);
          
          if (deleteError) throw deleteError;

          // Then insert new skills
          const skillsData = data.skills.map((serviceId: string) => ({
            employee_id: initialData.id,
            service_id: serviceId,
          }));

          const { error: insertError } = await supabase
            .from('employee_skills')
            .insert(skillsData);
          
          if (insertError) throw insertError;
        }
        
        toast.success('Staff member updated successfully');
      } else {
        // Create new employee
        const { data: newEmployee, error: employeeError } = await supabase
          .from('employees')
          .insert({
            name: data.name,
            email: data.email,
            phone: data.phone,
            photo_url: data.photo_url,
            status: data.status,
          })
          .select()
          .single();
        
        if (employeeError) throw employeeError;

        // Insert skills for new employee
        if (data.skills && data.skills.length > 0) {
          const skillsData = data.skills.map((serviceId: string) => ({
            employee_id: newEmployee.id,
            service_id: serviceId,
          }));

          const { error: skillsError } = await supabase
            .from('employee_skills')
            .insert(skillsData);
          
          if (skillsError) throw skillsError;
        }
        
        toast.success('Staff member created successfully');
      }
      
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-2xl font-bold">
            {initialData ? 'Edit Staff Member' : 'Add Staff Member'}
          </DialogTitle>
          <DialogDescription>
            {initialData 
              ? 'Update the staff member\'s information and skills below.'
              : 'Fill in the details below to add a new staff member to your team.'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-140px)] px-6">
          <div className="pb-6">
            <StaffForm
              initialData={initialData}
              onSubmit={handleSubmit}
              onCancel={() => onOpenChange(false)}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}