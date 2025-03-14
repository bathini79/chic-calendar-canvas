
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StaffForm } from "./StaffForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId?: string;
}

export function StaffDialog({ open, onOpenChange, employeeId }: StaffDialogProps) {
  const handleFormSubmit = async (data: any) => {
    try {
      let id = employeeId;
      
      // If editing, update employee record
      if (employeeId) {
        const { error } = await supabase
          .from("employees")
          .update({
            name: data.name,
            email: data.email,
            phone: data.phone,
            photo_url: data.photo_url,
            status: data.status,
            employment_type: data.employment_type,
          })
          .eq("id", employeeId);
          
        if (error) throw error;
        
        // Delete existing skills
        const { error: skillsDeleteError } = await supabase
          .from("employee_skills")
          .delete()
          .eq("employee_id", employeeId);
          
        if (skillsDeleteError) throw skillsDeleteError;
        
        // Delete existing location assignments
        const { error: locationsDeleteError } = await supabase
          .from("employee_locations")
          .delete()
          .eq("employee_id", employeeId);
          
        if (locationsDeleteError) throw locationsDeleteError;
      } 
      // If creating new, insert employee record
      else {
        const { data: newEmployee, error } = await supabase
          .from("employees")
          .insert({
            name: data.name,
            email: data.email,
            phone: data.phone,
            photo_url: data.photo_url,
            status: data.status,
            employment_type: data.employment_type,
          })
          .select()
          .single();
          
        if (error) throw error;
        id = newEmployee.id;
      }
      
      // Insert skills
      if (data.skills.length > 0) {
        const skillsToInsert = data.skills.map((skillId: string) => ({
          employee_id: id,
          service_id: skillId,
        }));
        
        const { error: skillsInsertError } = await supabase
          .from("employee_skills")
          .insert(skillsToInsert);
          
        if (skillsInsertError) throw skillsInsertError;
      }
      
      // Insert location assignments
      if (data.locations.length > 0) {
        const locationsToInsert = data.locations.map((locationId: string) => ({
          employee_id: id,
          location_id: locationId,
        }));
        
        const { error: locationsInsertError } = await supabase
          .from("employee_locations")
          .insert(locationsToInsert);
          
        if (locationsInsertError) throw locationsInsertError;
      }
      
      toast.success(employeeId ? "Staff member updated successfully" : "Staff member created successfully");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save staff member");
      console.error("Error saving staff member:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employeeId ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
        </DialogHeader>
        <StaffForm 
          onSubmit={handleFormSubmit} 
          onCancel={() => onOpenChange(false)} 
          employeeId={employeeId}
        />
      </DialogContent>
    </Dialog>
  );
}
