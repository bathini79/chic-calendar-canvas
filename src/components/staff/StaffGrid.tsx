
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, Trash } from "lucide-react";
import { toast } from "sonner";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface StaffGridProps {
  searchQuery: string;
  onEdit: (staffId: string) => void;
}

export function StaffGrid({ searchQuery, onEdit }: StaffGridProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<{ id: string, name: string } | null>(null);

  const { data: staff, refetch, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          employee_skills(
            service:services(*)
          )
        `)
        .ilike('name', `%${searchQuery}%`)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const promptDeleteEmployee = (employee: { id: string, name: string }) => {
    setEmployeeToDelete(employee);
    setShowDeleteDialog(true);
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setEmployeeToDelete(null);
  };

  const deleteEmployee = async () => {
    if (!employeeToDelete) return;

    try {
      const employeeId = employeeToDelete.id;
      setShowDeleteDialog(false);

      // First, delete related employee_skills records
      const { error: skillsError } = await supabase
        .from('employee_skills')
        .delete()
        .eq('employee_id', employeeId);
      
      if (skillsError) throw skillsError;
      
      // Delete related employee_locations records
      const { error: locationsError } = await supabase
        .from('employee_locations')
        .delete()
        .eq('employee_id', employeeId);
      
      if (locationsError) throw locationsError;
      
      // Delete employee verification records if they exist
      await supabase
        .from('employee_verification_codes')
        .delete()
        .eq('employee_id', employeeId);
        
      await supabase
        .from('employee_verification_links')
        .delete()
        .eq('employee_id', employeeId);

      // Get auth_id from the employee record
      const { data: employeeData, error: getEmployeeError } = await supabase
        .from('employees')
        .select('auth_id')
        .eq('id', employeeId)
        .single();
        
      if (getEmployeeError && getEmployeeError.code !== 'PGRST116') {
        throw getEmployeeError;
      }
      
      // Delete the employee record
      const { error: employeeError } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (employeeError) throw employeeError;

      // Delete the Authentication User and profile if auth_id exists
      if (employeeData?.auth_id) {
        try {
          // First try to delete the profile record
          const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', employeeData.auth_id);
          
          if (profileError) {
            console.error("Failed to delete profile:", profileError);
            // Continue with auth user deletion even if profile deletion fails
          }
          
          // Use the edge function to delete the auth user
          const { error: authError } = await supabase.functions.invoke('employee-onboarding', {
            body: { 
              action: 'delete',
              authUserId: employeeData.auth_id
            }
          });

          if (authError) throw authError;
        } catch (cleanupError) {
          console.error("Error cleaning up related records:", cleanupError);
          toast.error("Staff member deleted, but there was an issue cleaning up related accounts");
        }
      }

      toast.success("Staff member deleted successfully");
      setEmployeeToDelete(null);
      refetch();

    } catch (error: any) {
      toast.error(error.message || "Failed to delete staff member");
      console.error("Error deleting staff member:", error);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-32">Loading staff members...</div>;
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
        {staff?.map((member) => (
          <Card key={member.id} className="relative">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={member.photo_url} alt={member.name} />
                  <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h3 className="font-semibold text-lg">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {member.phone}
                  </p>
                  <div className={`text-xs px-2 py-0.5 mt-1 rounded-full inline-block ${
                    member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {member.status}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {member.employee_skills?.map((skill: any) => (
                    <span
                      key={skill.service.id}
                      className="text-xs bg-muted px-2 py-1 rounded-full"
                    >
                      {skill.service.name}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => promptDeleteEmployee({ id: member.id, name: member.name })}
              >
                <Trash className="h-4 w-4" />
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => onEdit(member.id)}
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete staff member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {employeeToDelete?.name}? This will permanently remove the staff member,
              their account, and all associated data from the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteEmployee} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
