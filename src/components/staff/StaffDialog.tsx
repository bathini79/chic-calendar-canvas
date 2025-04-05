
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StaffForm } from "./StaffForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

interface StaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId?: string;
}

export function StaffDialog({ open, onOpenChange, employeeId }: StaffDialogProps) {
  const [isVerifying, setIsVerifying] = useState(false);

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

  const checkPhoneExists = async (phoneNumber: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone_number', phoneNumber)
        .limit(1);
        
      if (error) throw error;
      return data && data.length > 0;
    } catch (error) {
      console.error("Error checking phone:", error);
      return false;
    }
  };

  const sendWhatsAppVerification = async (phoneNumber: string) => {
    try {
      setIsVerifying(true);
      
      // Call the function to send WhatsApp OTP
      const response = await supabase.functions.invoke('send-whatsapp-otp', {
        body: { phoneNumber }
      });
      
      if (response.error) {
        throw new Error(response.error.message || 'Failed to send verification code');
      }
      
      toast.success("Verification code sent to WhatsApp");
      return true;
    } catch (error: any) {
      toast.error(error.message || "Failed to send verification code");
      console.error("Error sending verification code:", error);
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFormSubmit = async (data: any) => {
    try {
      // Format phone number with country code
      const phoneNumber = data.phone.startsWith('+') ? data.phone : `+${data.country.code.substring(1)}${data.phone}`;
      
      // Check if phone already exists in profiles
      if (!employeeId) {
        const phoneExists = await checkPhoneExists(phoneNumber);
        if (phoneExists) {
          toast.error("This phone number is already registered with another user");
          return;
        }
      }
      
      let id = employeeId;
      
      // If creating new employee, first try to send WhatsApp verification
      if (!employeeId) {
        const verificationSent = await sendWhatsAppVerification(phoneNumber);
        if (!verificationSent) {
          return; // Don't proceed if verification failed to send
        }
      }
      
      // If editing, update employee record
      if (employeeId) {
        const { error } = await supabase
          .from("employees")
          .update({
            name: data.name,
            email: data.email || null,
            phone: phoneNumber,
            photo_url: data.photo_url,
            status: data.status,
            employment_type: data.employment_type,
            role: data.role,
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
      // If creating new, insert employee record with inactive status
      else {
        const { data: newEmployee, error } = await supabase
          .from("employees")
          .insert({
            name: data.name,
            email: data.email || null,
            phone: phoneNumber,
            photo_url: data.photo_url,
            status: 'inactive', // Set to inactive until verification
            employment_type: data.employment_type,
            role: data.role,
          })
          .select()
          .single();
          
        if (error) throw error;
        id = newEmployee.id;

        toast.info("Staff member created. They need to verify their phone number to activate their account.");
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
      
      toast.success(employeeId ? "Staff member updated successfully" : "Staff member registration initiated");
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
