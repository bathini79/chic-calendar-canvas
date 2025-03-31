
import React, { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RegularShiftsActionsProps {
  employee: any;
  onSetRegularShifts: () => void;
  onDataChange: () => void;
}

export function RegularShiftsActions({ employee, onSetRegularShifts, onDataChange }: RegularShiftsActionsProps) {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDeleteShiftsDialog, setConfirmDeleteShiftsDialog] = useState(false);
  const { toast } = useToast();

  const handleUnassignFromLocation = async () => {
    try {
      // Remove employee from all locations
      const { error } = await supabase
        .from('employee_locations')
        .delete()
        .eq('employee_id', employee.id);
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Employee unassigned from location",
      });
      
      onDataChange();
      setConfirmDialogOpen(false);
    } catch (error) {
      console.error('Error unassigning employee:', error);
      toast({
        title: "Error",
        description: "Failed to unassign employee",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAllShifts = async () => {
    try {
      // Delete all recurring shifts
      const { error: recurringError } = await supabase
        .from('recurring_shifts')
        .delete()
        .eq('employee_id', employee.id);
        
      if (recurringError) throw recurringError;
      
      // Delete all specific shifts
      const { error: specificError } = await supabase
        .from('shifts')
        .delete()
        .eq('employee_id', employee.id);
        
      if (specificError) throw specificError;
      
      setConfirmDeleteShiftsDialog(false);
      toast({
        title: "Success",
        description: "All shifts have been deleted",
      });
      
      onDataChange();
    } catch (error) {
      console.error('Error deleting shifts:', error);
      toast({
        title: "Error",
        description: "Failed to delete shifts",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Pencil className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onSetRegularShifts}>
            Set regular shifts
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirmDialogOpen(true)}>
            Unassign from location
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.location.href = `/admin/Staff?edit=${employee.id}`}>
            Edit team member
          </DropdownMenuItem>
          <DropdownMenuItem className="text-red-500" onClick={() => setConfirmDeleteShiftsDialog(true)}>
            Delete all shifts
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Confirm unassign dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm unassign</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to unassign {employee.name} from this location?</p>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleUnassignFromLocation}>
              Unassign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Confirm delete shifts dialog */}
      <Dialog open={confirmDeleteShiftsDialog} onOpenChange={setConfirmDeleteShiftsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm deletion</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete all shifts for {employee.name}?</p>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmDeleteShiftsDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAllShifts}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
