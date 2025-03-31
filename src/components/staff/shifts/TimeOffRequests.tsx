
import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, ChevronRight } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { AddTimeOffDialog } from './dialogs/AddTimeOffDialog';

interface TimeOffRequestsProps {
  locations: any[];
  employees: any[];
  selectedLocation?: string;
  setSelectedLocation?: (locationId: string) => void;
  onDataChange?: () => void;
}

export function TimeOffRequests({ 
  locations, 
  employees,
  selectedLocation = '', 
  setSelectedLocation,
  onDataChange = () => {} 
}: TimeOffRequestsProps) {
  const [timeOffRequests, setTimeOffRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddTimeOffDialog, setShowAddTimeOffDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { toast } = useToast();
  
  // Load all time off requests
  useEffect(() => {
    const loadTimeOffRequests = async () => {
      try {
        setIsLoading(true);
        let query = supabase
          .from('time_off_requests')
          .select(`
            *,
            employees(id, name, photo_url, employment_type)
          `)
          .order('start_date', { ascending: false });
        
        // Filter by location if specified
        if (selectedLocation && selectedLocation !== 'all') {
          query = query.eq('location_id', selectedLocation);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        setTimeOffRequests(data || []);
      } catch (error) {
        console.error('Error loading time off requests:', error);
        toast({
          title: 'Error',
          description: 'Failed to load time off requests.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTimeOffRequests();
  }, [selectedLocation, refreshTrigger]);
  
  const handleUpdateStatus = async (id: string, status: 'approved' | 'declined') => {
    try {
      const { error } = await supabase
        .from('time_off_requests')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `Time off request has been ${status}.`,
      });
      
      // Refresh the list
      setRefreshTrigger(prev => prev + 1);
      onDataChange(); // Notify parent component about the change
    } catch (error) {
      console.error('Error updating time off request:', error);
      toast({
        title: 'Error',
        description: 'Failed to update time off request.',
        variant: 'destructive'
      });
    }
  };

  const handleDialogClose = (saved: boolean = false) => {
    setShowAddTimeOffDialog(false);
    setSelectedEmployee(null);
    
    if (saved) {
      setRefreshTrigger(prev => prev + 1);
      onDataChange(); // Notify parent component about the change
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Time Off Requests</h2>
        <div className="flex gap-2 items-center">
          {setSelectedLocation && (
            <select 
              className="border rounded-md p-2"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <option value="all">All Locations</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          )}
          <Button 
            variant="default" 
            className="whitespace-nowrap"
            onClick={() => setShowAddTimeOffDialog(true)}
          >
            Add Time Off
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="text-center py-10">Loading time off requests...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left px-4 py-2">Team member</th>
                <th className="text-left px-4 py-2">Dates</th>
                <th className="text-left px-4 py-2">Reason</th>
                {locations.length > 1 && <th className="text-left px-4 py-2">Location</th>}
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {timeOffRequests.length === 0 ? (
                <tr>
                  <td colSpan={locations.length > 1 ? 6 : 5} className="text-center py-4">No time off requests found</td>
                </tr>
              ) : (
                timeOffRequests.map((request) => (
                  <tr key={request.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          {request.employees?.photo_url ? (
                            <img 
                              src={request.employees.photo_url} 
                              alt={request.employees?.name} 
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <span>
                              {request.employees?.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{request.employees?.name}</p>
                          <p className="text-xs text-gray-500">{request.employees?.employment_type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {format(parseISO(request.start_date), 'MMM d, yyyy')}
                      {request.start_date !== request.end_date && (
                        <> - {format(parseISO(request.end_date), 'MMM d, yyyy')}</>
                      )}
                    </td>
                    <td className="px-4 py-3">{request.reason || 'No reason provided'}</td>
                    {locations.length > 1 && (
                      <td className="px-4 py-3">
                        {locations.find(loc => loc.id === request.location_id)?.name || 'All Locations'}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <Badge className={getStatusColor(request.status)}>
                        {request.status === 'approved' ? 'Approved' : 
                         request.status === 'declined' ? 'Declined' : 'Pending'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {request.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline" 
                            size="sm"
                            className="px-3 text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => handleUpdateStatus(request.id, 'approved')}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline" 
                            size="sm"
                            className="px-3 text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => handleUpdateStatus(request.id, 'declined')}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Decline
                          </Button>
                        </div>
                      )}
                      {request.status !== 'pending' && (
                        <span className="text-sm text-gray-500">
                          {request.status === 'approved' ? 'Approved' : 'Declined'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {showAddTimeOffDialog && (
        <AddTimeOffDialog
          isOpen={showAddTimeOffDialog}
          onClose={handleDialogClose}
          employees={employees}
          selectedEmployee={selectedEmployee}
          locations={locations}
          selectedLocation={selectedLocation}
        />
      )}
      
      {/* Mobile add button */}
      <Button 
        className="fixed bottom-4 right-4 md:hidden rounded-full h-14 w-14 flex items-center justify-center shadow-lg" 
        size="icon"
        onClick={() => setShowAddTimeOffDialog(true)}
      >
        <ChevronRight className="h-6 w-6" />
      </Button>
    </div>
  );
}
