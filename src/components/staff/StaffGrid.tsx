import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Edit, Trash } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { AvailabilityDialog } from "./AvailabilityDialog";

interface StaffGridProps {
  searchQuery: string;
  onEdit: (staff: any) => void;
}

export function StaffGrid({ searchQuery, onEdit }: StaffGridProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);

  const { data: staff, refetch } = useQuery({
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

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Staff member deleted successfully");
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {staff?.map((member) => (
          <Card key={member.id}>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={member.photo_url} alt={member.name} />
                  <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h3 className="font-semibold text-lg">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
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
            <CardFooter className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedEmployee(member.id);
                  setAvailabilityDialogOpen(true);
                }}
              >
                <Clock className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(member.id)}
              >
                <Trash className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(member)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {selectedEmployee && (
        <AvailabilityDialog
          open={availabilityDialogOpen}
          onOpenChange={setAvailabilityDialogOpen}
          employeeId={selectedEmployee}
        />
      )}
    </>
  );
}