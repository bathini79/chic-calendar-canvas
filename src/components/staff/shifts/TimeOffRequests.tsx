import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { ChevronRight, Info, Plus, Search } from 'lucide-react';
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
import { Input } from "@/components/ui/input";
import { DataPagination, STANDARD_PAGE_SIZES } from "@/components/common/DataPagination";

interface TimeOffRequestsProps {
  locations: any[];
  employees: any[];
  searchQuery: string;
}

export function TimeOffRequests({ locations, employees, searchQuery }: TimeOffRequestsProps) {
  const [timeOffRequests, setTimeOffRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddTimeOffDialog, setShowAddTimeOffDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const { toast } = useToast();
  
  // Use this for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(STANDARD_PAGE_SIZES[0]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (locations?.length > 0 && !selectedLocation) {
      setSelectedLocation(locations[0]?.id);
    }
  }, [locations, selectedLocation]);

  useEffect(() => {
    fetchTimeOffRequests();
  }, [selectedLocation]);

  useEffect(() => {
    if (!timeOffRequests) {
      setFilteredRequests([]);
      setTotalCount(0);
      return;
    }
    
    let filtered = timeOffRequests;
    
    if (searchQuery) {
      filtered = timeOffRequests.filter(req => 
        req.employees?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.reason?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setTotalCount(filtered.length);
    
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedRequests = filtered.slice(startIndex, startIndex + pageSize);
    
    setFilteredRequests(paginatedRequests);
  }, [timeOffRequests, searchQuery, currentPage, pageSize]);

  const fetchTimeOffRequests = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('time_off_requests')
        .select(`
          *,
          employees(*)
        `)
        .order('start_date', { ascending: false });
        
      if (selectedLocation) {
        query = query.eq('location_id', selectedLocation);
      }
      
      const { data, error } = await query;
        
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
      case 'declined':
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
        .update({ status: 'approved' as 'approved' | 'pending' | 'declined' })
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
        .update({ status: 'declined' })
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
      
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex space-x-2 items-center">
          <select 
            className="border rounded-md p-2"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="text-center py-10">Loading time off requests...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500">
            {searchQuery 
              ? `No time off requests found for "${searchQuery}"` 
              : "No time off requests found"}
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => setShowAddTimeOffDialog(true)}
          >
            Add Time Off Request
          </Button>
        </div>
      ) : (
        <Table>          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Leave Type</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="bg-black-100 rounded-full h-8 w-8 flex items-center justify-center">
                      {request.employees?.name?.split(' ').map((n: string) => n[0]).join('') || '??'}
                    </div>
                    <span>{request.employees?.name || 'Unknown Employee'}</span>
                  </div>
                </TableCell>                <TableCell>{request.reason || 'Not specified'}</TableCell>
                <TableCell>{request.leave_type ? (request.leave_type === 'paid' ? 'Paid' : 'Unpaid') : 'Not specified'}</TableCell>
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
      
      {totalCount > 0 && (
        <div className="px-4 py-4 border-t border-gray-200">
          <DataPagination
            currentPage={currentPage}
            totalItems={totalCount}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={STANDARD_PAGE_SIZES}
          />
        </div>
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
        selectedLocation={selectedLocation}
      />
      
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
