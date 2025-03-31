
import React, { useState, useEffect } from 'react';
import { format, parseISO, isAfter } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  ChevronRight, 
  Trash2, 
  Check, 
  X, 
  Plus 
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { AddTimeOffDialog } from './dialogs/AddTimeOffDialog';

interface TimeOffRequestsProps {
  locations: any[];
  employees: any[];
  selectedLocation?: string;
  onDataChange: () => void;
}

export function TimeOffRequests({ 
  locations, 
  employees,
  selectedLocation = "",
  onDataChange
}: TimeOffRequestsProps) {
  const [timeOffs, setTimeOffs] = useState<any[]>([]);
  const [filteredTimeOffs, setFilteredTimeOffs] = useState<any[]>([]);
  const [showAddTimeOffDialog, setShowAddTimeOffDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'pending' | 'approved'>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [dataVersion, setDataVersion] = useState(0);

  // Fetch time off requests
  useEffect(() => {
    const fetchTimeOffs = async () => {
      try {
        setIsLoading(true);

        let query = supabase
          .from('time_off_requests')
          .select(`
            *,
            employees(*)
          `)
          .order('start_date', { ascending: false });
        
        if (selectedLocation && selectedLocation !== "all") {
          query = query.eq('location_id', selectedLocation);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;

        setTimeOffs(data || []);
      } catch (error) {
        console.error('Error fetching time offs:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch time off requests',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimeOffs();
  }, [selectedLocation, dataVersion]);

  // Apply filters when viewMode or selectedEmployee changes
  useEffect(() => {
    let filtered = timeOffs;
    
    // Filter by status
    if (viewMode !== 'all') {
      filtered = filtered.filter(timeOff => timeOff.status === viewMode);
    }
    
    // Filter by employee
    if (selectedEmployee !== "all") {
      filtered = filtered.filter(timeOff => timeOff.employee_id === selectedEmployee);
    }
    
    setFilteredTimeOffs(filtered);
  }, [timeOffs, viewMode, selectedEmployee]);

  const refreshData = () => {
    setDataVersion(prev => prev + 1);
    onDataChange();
  };

  const handleStatusChange = async (timeOffId: string, newStatus: 'approved' | 'denied') => {
    try {
      const { error } = await supabase
        .from('time_off_requests')
        .update({ status: newStatus === 'denied' ? 'declined' : newStatus })
        .eq('id', timeOffId);
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `Time off request ${newStatus}`,
      });
      
      refreshData();
    } catch (error) {
      console.error('Error updating time off status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update time off status',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (timeOffId: string) => {
    if (!confirm('Are you sure you want to delete this time off request?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('time_off_requests')
        .delete()
        .eq('id', timeOffId);
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Time off request deleted',
      });
      
      refreshData();
    } catch (error) {
      console.error('Error deleting time off:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete time off request',
        variant: 'destructive'
      });
    }
  };

  const handleAddTimeOff = () => {
    setShowAddTimeOffDialog(true);
  };

  const handleTimeOffDialogClose = (saved: boolean = false) => {
    setShowAddTimeOffDialog(false);
    
    if (saved) {
      refreshData();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Time Off Requests</h2>
        <Button variant="default" onClick={handleAddTimeOff}>
          Add Time Off
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <select 
            className="border rounded-md p-2"
            value={viewMode} 
            onChange={(e) => setViewMode(e.target.value as 'all' | 'pending' | 'approved')}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>
        </div>
        
        <div>
          <select 
            className="border rounded-md p-2"
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
          >
            <option value="all">All Employees</option>
            {employees.map(employee => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="text-center py-4">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTimeOffs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    No time off requests found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTimeOffs.map(timeOff => {
                  const startDate = parseISO(timeOff.start_date);
                  const endDate = parseISO(timeOff.end_date);
                  const isPast = isAfter(new Date(), endDate);
                  
                  return (
                    <TableRow key={timeOff.id}>
                      <TableCell>
                        {timeOff.employees?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {format(startDate, 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {format(endDate, 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {timeOff.reason || 'No reason provided'}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded ${
                          timeOff.status === 'approved' ? 'bg-green-100 text-green-800' :
                          timeOff.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {timeOff.status.charAt(0).toUpperCase() + timeOff.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {timeOff.status === 'pending' && !isPast && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleStatusChange(timeOff.id, 'approved')}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleStatusChange(timeOff.id, 'denied')}
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDelete(timeOff.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {showAddTimeOffDialog && (
        <AddTimeOffDialog
          isOpen={showAddTimeOffDialog}
          onClose={(saved) => handleTimeOffDialogClose(saved)}
          employees={employees}
          selectedLocation={selectedLocation}
        />
      )}
    </div>
  );
}
