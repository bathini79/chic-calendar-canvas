import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StaffForm } from "./StaffForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface StaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId?: string;
}

export function StaffDialog({ open, onOpenChange, employeeId }: StaffDialogProps) {
  // Fetch employee data if editing
  const { data: employeeData } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          employee_skills(service_id),
          employee_locations(location_id)
        `)
        .eq('id', employeeId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId
  });

  const handleFormSubmit = async (data: any) => {
    try {
      // If editing existing employee
      if (employeeId) {
        const { error } = await supabase
          .from("employees")
          .update({
            name: data.name,
            email: data.email || `${data.phone.replace(/\D/g, '')}@staff.internal`, // Ensure email is never null
            phone: data.phone,
            photo_url: data.photo_url,
            status: data.status,
            employment_type_id: data.employment_type_id,
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
          
        // Insert skills
        if (data.skills.length > 0) {
          const skillsToInsert = data.skills.map((skillId: string) => ({
            employee_id: employeeId,
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
            employee_id: employeeId,
            location_id: locationId,
          }));
          
          const { error: locationsInsertError } = await supabase
            .from("employee_locations")
            .insert(locationsToInsert);
            
          if (locationsInsertError) throw locationsInsertError;
        }
        
        toast.success("Staff member updated successfully");
      } 
      // Creating new employee - use the onboarding edge function
      else {
        // Get the current window location to create the verification link
        const baseUrl = window.location.origin;
        
        // Call the employee-onboarding edge function with updated parameters
        const { data: responseData, error } = await supabase.functions.invoke('employee-onboarding', {
          body: { 
            employeeData: {
              ...data,
              status: 'inactive', // Always set to inactive for new employees
              baseUrl
            },
            sendWelcomeMessage: true,
            createAuthAccount: true,
            sendVerificationLink: true
          }
        });
        
        if (error) throw error;
        
        if (!responseData.success) {
          throw new Error(responseData.message || "Failed to onboard employee");
        }
        
        // Show appropriate toast messages based on the response
        if (responseData.verificationSent) {
          toast.success("Staff member created! Verification link sent to their phone");
        } else if (responseData.welcomeMessageSent) {
          toast.success("Staff member created! Welcome message sent to their phone");
        } else {
          toast.success("Staff member created successfully");
          toast.warning("Could not send notifications to the staff member");
        }
      }
      
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
          initialData={employeeData}
        />
      </DialogContent>
    </Dialog>
  );
}
