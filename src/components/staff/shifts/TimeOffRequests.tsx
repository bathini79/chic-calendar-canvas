
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { ChevronRight, Info, Plus } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { 
  Table,
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { AddTimeOffDialog } from './dialogs/AddTimeOffDialog';

interface TimeOffRequestsProps {
  locations: any[];
  employees: any[];
}

export function TimeOffRequests({ locations, employees }: TimeOffRequestsProps) {
  const [timeOffRequests, setTimeOffRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddTimeOffDialog, setShowAddTimeOffDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTimeOffRequests();
  }, []);

  const fetchTimeOffRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('time_off_requests')
        .select(`
          *,
          employees(*)
        `)
        .order('start_date', { ascending: false });
        
      if (error) throw error;
      
      setTimeOffRequests(data || []);
    } catch (error) {
      console.error('Error fetching time off requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch time off requests.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    let badgeClass = '';
    
    switch (status) {
      case 'approved':
        badgeClass = 'bg-green-100 text-green-800';
        break;
      case 'denied':
        badgeClass = 'bg-red-100 text-red-800';
        break;
      case 'pending':
      default:
        badgeClass = 'bg-yellow-100 text-yellow-800';
        break;
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${badgeClass}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('time_off_requests')
        .update({ status: 'approved' })
        .eq('id', id);
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Time off request approved.',
      });
      
      fetchTimeOffRequests();
    } catch (error) {
      console.error('Error approving time off request:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve time off request.',
        variant: 'destructive'
      });
    }
  };

  const handleDeny = async (id: string) => {
    try {
      const { error } = await supabase
        .from('time_off_requests')
        .update({ status: 'denied' })
        .eq('id', id);
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Time off request denied.',
      });
      
      fetchTimeOffRequests();
    } catch (error) {
      console.error('Error denying time off request:', error);
      toast({
        title: 'Error',
        description: 'Failed to deny time off request.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Time Off Requests</h2>
        <Button variant="default" onClick={() => setShowAddTimeOffDialog(true)}>
          Add
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
      
      {isLoading ? (
        <div className="text-center py-10">Loading time off requests...</div>
      ) : timeOffRequests.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500">No time off requests found</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => setShowAddTimeOffDialog(true)}
          >
            Add Time Off Request
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {timeOffRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="bg-purple-100 rounded-full h-8 w-8 flex items-center justify-center">
                      {request.employees?.name?.split(' ').map((n: string) => n[0]).join('') || '??'}
                    </div>
                    <span>{request.employees?.name || 'Unknown Employee'}</span>
                  </div>
                </TableCell>
                <TableCell>{request.reason || 'Not specified'}</TableCell>
                <TableCell>{format(new Date(request.start_date), 'MMM d, yyyy')}</TableCell>
                <TableCell>{format(new Date(request.end_date), 'MMM d, yyyy')}</TableCell>
                <TableCell>{getStatusBadge(request.status)}</TableCell>
                <TableCell className="text-right">
                  {request.status === 'pending' && (
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeny(request.id)}
                      >
                        Deny
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => handleApprove(request.id)}
                      >
                        Approve
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      
      <div className="bg-blue-50 p-4 rounded-lg flex items-start">
        <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
        <p className="text-sm">
          Online bookings cannot be placed during approved time off periods.
        </p>
      </div>
      
      <AddTimeOffDialog
        isOpen={showAddTimeOffDialog}
        onClose={() => {
          setShowAddTimeOffDialog(false);
          setSelectedRequest(null);
          fetchTimeOffRequests();
        }}
        employees={employees}
        selectedEmployee={selectedRequest?.employee || null}
      />
      
      {/* Mobile add button */}
      <Button 
        className="fixed bottom-4 right-4 md:hidden rounded-full h-14 w-14 flex items-center justify-center shadow-lg" 
        size="icon"
        onClick={() => setShowAddTimeOffDialog(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
