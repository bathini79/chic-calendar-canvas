import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, Trash } from "lucide-react";
import { toast } from "sonner";

interface StaffListProps {
  searchQuery: string;
  onEdit: (staff: any) => void;
}

export function StaffList({ searchQuery, onEdit }: StaffListProps) {
  const { data: staff, refetch } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          employee_skills(
            service:services(*)
          ),
          employee_availability(*)
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
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Staff Member</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Skills</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff?.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarImage src={member.photo_url} alt={member.name} />
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span>{member.name}</span>
                </div>
              </TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell>{member.phone || '-'}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {member.employee_skills?.map((skill: any) => (
                    <span
                      key={skill.service.id}
                      className="text-xs bg-muted px-2 py-1 rounded-full"
                    >
                      {skill.service.name}
                    </span>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  member.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {member.status}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
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
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}