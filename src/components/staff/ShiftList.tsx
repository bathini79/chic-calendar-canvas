import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Plus } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { ShiftDialog } from "./ShiftDialog";

export function ShiftList() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select(`
          *,
          employee:employees(
            id,
            name,
            email
          )
        `)
        .order('start_time');
      
      if (error) throw error;
      return data;
    },
  });

  const handleCreate = () => {
    setSelectedShift(null);
    setDialogOpen(true);
  };

  const handleEdit = (shift: any) => {
    setSelectedShift(shift);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Shift
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {shifts?.map((shift) => (
          <div
            key={shift.id}
            className="border rounded-lg p-4 space-y-3 hover:border-primary transition-colors"
            onClick={() => handleEdit(shift)}
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(shift.start_time), 'PPP')}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {format(new Date(shift.start_time), 'p')} - {format(new Date(shift.end_time), 'p')}
              </span>
            </div>
            <div>
              <h3 className="font-medium">{shift.employee?.name}</h3>
              <p className="text-sm text-muted-foreground">{shift.employee?.email}</p>
            </div>
          </div>
        ))}
      </div>

      <ShiftDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        shift={selectedShift}
      />
    </div>
  );
}