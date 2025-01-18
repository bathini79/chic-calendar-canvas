import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, Trash } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface StaffGridProps {
  searchQuery: string;
  onEdit: (staff: any) => void;
}

export function StaffGrid({ searchQuery, onEdit }: StaffGridProps) {
  const { data: staff, isLoading, error } = useQuery({
    queryKey: ['employees', searchQuery],
    queryFn: async () => {
      try {
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
        
        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        
        return data;
      } catch (error: any) {
        console.error('Query error:', error);
        throw new Error(error.message || 'Failed to fetch staff members');
      }
    },
    retry: 2,
  });

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Staff member deleted successfully");
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4 text-center">
        <p className="text-destructive">Error loading staff members. Please try again later.</p>
        <Button 
          variant="outline" 
          className="mt-2"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
              onClick={() => handleDelete(member.id)}
            >
              <Trash className="h-4 w-4" />
              Delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => onEdit(member)}
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}