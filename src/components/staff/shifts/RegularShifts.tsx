
import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { SetRegularShiftsDialog } from './dialogs/SetRegularShiftsDialog';
import { RegularShiftsActions } from './RegularShiftsActions';
import { useToast } from '@/hooks/use-toast';

interface RegularShiftsProps {
  locations: any[];
  selectedLocation: string;
  setSelectedLocation: (locationId: string) => void;
  employees: any[];
  onDataChange: () => void;
}

export function RegularShifts({ 
  locations, 
  selectedLocation,
  setSelectedLocation,
  employees,
  onDataChange
}: RegularShiftsProps) {
  const [recurringShifts, setRecurringShifts] = useState<any[]>([]);
  const [showSetRegularShiftDialog, setShowSetRegularShiftDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const { toast } = useToast();

  // Fetch recurring shifts
  useEffect(() => {
    const fetchShifts = async () => {
      try {
        let query = supabase.from('recurring_shifts').select('*');
        
        if (selectedLocation && selectedLocation !== "all") {
          query = query.eq('location_id', selectedLocation);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        setRecurringShifts(data || []);
      } catch (error) {
        console.error('Error fetching recurring shifts:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch shifts',
          variant: 'destructive'
        });
      }
    };
    
    fetchShifts();
  }, [selectedLocation, dataVersion]);

  // Get shifts for a specific employee and day
  const getEmployeeShiftsForDay = (employeeId: string, dayOfWeek: number) => {
    return recurringShifts.filter(shift => 
      shift.employee_id === employeeId && shift.day_of_week === dayOfWeek
    );
  };

  // Format time for display
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12; // Convert 0 to 12 for 12 AM
    
    return `${displayHour}:${minutes} ${period}`;
  };

  const handleOpenSetRegularShiftDialog = (employee: any) => {
    setSelectedEmployee(employee);
    setShowSetRegularShiftDialog(true);
  };

  const handleDialogClose = (saved: boolean = false) => {
    setShowSetRegularShiftDialog(false);
    
    if (saved) {
      // Refresh data if changes were made
      setDataVersion(prev => prev + 1);
      onDataChange();
    }
  };

  const refreshData = () => {
    setDataVersion(prev => prev + 1);
    onDataChange();
  };

  // Day of week labels
  const days = [
    { id: 1, name: "Monday" },
    { id: 2, name: "Tuesday" },
    { id: 3, name: "Wednesday" },
    { id: 4, name: "Thursday" },
    { id: 5, name: "Friday" },
    { id: 6, name: "Saturday" },
    { id: 0, name: "Sunday" }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Regular Shifts</h2>
        <div className="flex space-x-2">
          <Button variant="outline" className="hidden md:flex">
            Options
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="default" onClick={() => setShowSetRegularShiftDialog(true)}>
            Add
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
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
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-52">Team member</TableHead>
              {days.map(day => (
                <TableHead key={day.id} className="text-center">{day.name}</TableHead>
              ))}
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">No staff members found</TableCell>
              </TableRow>
            ) : (
              employees.map(employee => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-100 rounded-full h-10 w-10 flex items-center justify-center">
                        {employee.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-xs text-gray-500">{employee.employment_type}</p>
                      </div>
                    </div>
                  </TableCell>
                  
                  {days.map(day => {
                    const shifts = getEmployeeShiftsForDay(employee.id, day.id);
                    
                    return (
                      <TableCell key={day.id} className="text-center">
                        {shifts.length > 0 ? (
                          <div>
                            {shifts.map(shift => (
                              <Badge key={shift.id} className="mb-1 bg-blue-100 text-blue-800 hover:bg-blue-200">
                                {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                    );
                  })}
                  
                  <TableCell>
                    <RegularShiftsActions 
                      employee={employee} 
                      onSetRegularShifts={() => handleOpenSetRegularShiftDialog(employee)}
                      onDataChange={refreshData}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showSetRegularShiftDialog && (
        <SetRegularShiftsDialog
          isOpen={showSetRegularShiftDialog}
          onClose={(saved) => handleDialogClose(saved)}
          employee={selectedEmployee}
          onSave={() => handleDialogClose(true)}
          locationId={selectedLocation}
        />
      )}
    </div>
  );
}
