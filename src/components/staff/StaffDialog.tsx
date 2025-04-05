
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StaffForm } from "./StaffForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { generateStrongPassword } from "@/lib/utils";

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

  const sendWhatsAppVerification = async (phoneNumber: string, employeeId: string, name: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-employee-otp', {
        body: { 
          phoneNumber,
          employeeId,
          name
        }
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast.success("Verification message sent to WhatsApp");
        return true;
      } else {
        toast.error(data.message || "Failed to send verification");
        return false;
      }
    } catch (error: any) {
      console.error("Error sending WhatsApp verification:", error);
      toast.error(error.message || "Failed to send verification");
      return false;
    }
  };

  const createAuthUser = async (data: any, employeeId: string) => {
    try {
      // Generate email from phone if not provided
      const email = data.email || `${data.phone.replace(/\D/g, '')}@staff.internal`;
      const password = generateStrongPassword();
      
      // Create user in auth
      const { data: authData, error: authError } = await supabase.functions.invoke('create-employee-auth', {
        body: {
          email,
          phone: data.phone,
          password,
          employeeId,
          name: data.name,
        }
      });
      
      if (authError) throw authError;
      
      if (!authData.success) {
        throw new Error(authData.message || "Failed to create employee account");
      }
      
      return true;
    } catch (error: any) {
      console.error("Error creating auth user:", error);
      toast.error(error.message || "Failed to create employee account");
      return false;
    }
  };

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
      // If creating new, insert employee record with inactive status initially
      else {
        const { data: newEmployee, error } = await supabase
          .from("employees")
          .insert({
            name: data.name,
            email: data.email,
            phone: data.phone,
            photo_url: data.photo_url,
            status: 'inactive', // Set as inactive until verified
            employment_type: data.employment_type,
          })
          .select()
          .single();
          
        if (error) throw error;
        id = newEmployee.id;
        
        // Create auth user for the employee
        const authCreated = await createAuthUser(data, id);
        if (!authCreated) {
          // If auth creation fails, delete the employee record
          await supabase.from("employees").delete().eq("id", id);
          throw new Error("Failed to create employee account");
        }
        
        // Send WhatsApp verification to the newly created employee
        const verificationSent = await sendWhatsAppVerification(data.phone, id, data.name);
        if (!verificationSent) {
          // If verification sending fails, we continue but inform the user
          toast.warning("Employee created but verification message could not be sent");
        }
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
      
      toast.success(employeeId 
        ? "Staff member updated successfully" 
        : "Staff member created successfully. Verification sent to WhatsApp"
      );
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
