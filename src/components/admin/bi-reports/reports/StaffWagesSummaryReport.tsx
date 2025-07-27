import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Filter,
  IndianRupee,
  Clock,
  User,
  MapPin,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ReportDataTable, ReportColumn } from '../components/ReportDataTable';
import { useExportContext } from '../layout/ReportsLayout';

// Group By options type
type GroupByOption = 'employee' | 'location' | 'day' | 'month' | 'quarter' | 'year';

interface StaffWagesSummaryData {
  id: string;
  group_by_value: string;
  group_by_type: GroupByOption;
  total_wages: number;
  base_wages: number;
  overtime_wages: number;
  hours_worked: number;
  hourly_rate: number;
  employee_name?: string;
  location_name?: string;
  date?: string;
}

interface LocationData {
  id: string;
  name: string;
}

export function StaffWagesSummaryReport() {
  const isMobile = useIsMobile();
  const { setExportData, setReportName } = useExportContext();
  // States for filters and data
  const [selectedGroupBy, setSelectedGroupBy] = useState<GroupByOption>('employee');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [showFilterDialog, setShowFilterDialog] = useState(false);

  // Fetch locations
  const { data: locations = [] } = useQuery<LocationData[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .order('name');

      if (error) throw new Error(error.message);
      return data || [];
    },
  });
  // We no longer use date range filtering
  const currentDate = useMemo(() => {
    return format(new Date(), 'PP');
  }, []);  // Fetch staff wages data
  const {
    data: wagesData = [],
    isLoading,
    refetch,
  } = useQuery<StaffWagesSummaryData[]>({
    queryKey: ['staff-wages', selectedGroupBy, selectedLocation],
    queryFn: async () => {
      // Instead of using a custom RPC, we'll fetch and process data from base tables
      // Query pay_run_items for wages and employee details
      let query = supabase
        .from('pay_run_items')
        .select(`
          id,
          employee_id,
          amount,
          compensation_type,
          description,
          created_at,
          employees!pay_run_items_employee_id_fkey (
            id, 
            name,
            employee_locations!inner (
              location_id
            ),
            employee_compensation_settings (
              base_amount,
              effective_from,
              effective_to
            )
          )
        `)
        .in('compensation_type', ['wages', 'salary']);

      // Apply location filter if needed
      if (selectedLocation !== 'all') {
        query = query.eq('employees.employee_locations.location_id', selectedLocation);
      }

      const { data: wageItems, error: wageError } = await query;

      if (wageError) throw new Error(wageError.message);

      // Group and process the data based on selected grouping
      const groupedData: Record<string, any> = {};

      wageItems.forEach(item => {
        if (!item.employees) return;
        
        const employee = item.employees;
        
        // Determine the group key based on selected groupBy
        let groupKey = '';
        let groupName = '';
        let locationName = 'All Locations';

        if (selectedGroupBy === 'employee') {
          groupKey = employee.id || 'unknown';
          groupName = employee.name || 'Unknown';
        } 
        else if (selectedGroupBy === 'location' && employee.employee_locations?.[0]?.location_id) {
          groupKey = employee.employee_locations[0].location_id;
          // We'd need to fetch location name separately, for now use location id
          locationName = groupKey;
          groupName = locationName;
        }
        else if (selectedGroupBy.match(/day|month|year/)) {
          // Format date according to grouping
          const dateObj = new Date(item.created_at);
          if (selectedGroupBy === 'day') {
            groupKey = format(dateObj, 'yyyy-MM-dd');
            groupName = format(dateObj, 'PP');
          } else if (selectedGroupBy === 'month') {
            groupKey = format(dateObj, 'yyyy-MM');
            groupName = format(dateObj, 'MMMM yyyy');
          } else if (selectedGroupBy === 'quarter') {
            const quarter = Math.floor((dateObj.getMonth() / 3)) + 1;
            groupKey = `${dateObj.getFullYear()}-Q${quarter}`;
            groupName = `Q${quarter} ${dateObj.getFullYear()}`;
          } else if (selectedGroupBy === 'year') {
            groupKey = format(dateObj, 'yyyy');
            groupName = groupKey;
          }
        }

        // Initialize group if not exists
        if (!groupedData[groupKey]) {
          groupedData[groupKey] = {
            id: groupKey,
            group_by_value: groupName,
            group_by_type: selectedGroupBy,
            employee_name: selectedGroupBy === 'employee' ? groupName : 'Various',
            location_name: locationName,
            date: selectedGroupBy.match(/day|month|year|quarter/) ? groupName : 'N/A',
            total_wages: 0,
            base_wages: 0,
            overtime_wages: 0,
            hours_worked: 0,
            hourly_rate: 0
          };
        }

        // Determine wage type and add to appropriate total
        const amount = parseFloat(item.amount) || 0;
        groupedData[groupKey].total_wages += amount;
        
        if (item.description?.toLowerCase().includes('overtime')) {
          groupedData[groupKey].overtime_wages += amount;
        } else {
          groupedData[groupKey].base_wages += amount;
        }
        
        // Estimate hours worked - this is a placeholder as real data would need actual hours
        // In a real system, you'd have a time tracking table to get this information
        if (employee.employee_compensation_settings?.[0]?.base_amount > 0) {
          const hourlyRate = employee.employee_compensation_settings[0].base_amount / (20 * 8); // Assume monthly salary ÷ (20 days × 8 hours)
          const estimatedHours = amount / hourlyRate;
          groupedData[groupKey].hours_worked += estimatedHours;
          groupedData[groupKey].hourly_rate = hourlyRate;
        }
      });

      // Get correct location names if needed
      if (selectedGroupBy === 'location') {
        const locationIds = Object.keys(groupedData).filter(id => id !== 'unknown');
        if (locationIds.length > 0) {
          const { data: locationData } = await supabase
            .from('locations')
            .select('id, name')
            .in('id', locationIds);
            
          if (locationData) {
            locationData.forEach(loc => {
              if (groupedData[loc.id]) {
                groupedData[loc.id].group_by_value = loc.name;
                groupedData[loc.id].location_name = loc.name;
              }
            });
          }
        }
      }      // Convert to array and return
      return Object.values(groupedData);
    },
    enabled: true,
  });

  // Define columns for the table
  const columns = useMemo<ReportColumn[]>(() => {
    const baseColumns = [
      {
        key: 'group_by_value',
        label: selectedGroupBy === 'employee' ? 'Staff Member' 
             : selectedGroupBy === 'location' ? 'Location'
             : 'Date',
        sortable: true,
        filterable: true,
        width: '25%',
      },
      {
        key: 'total_wages',
        label: 'Total Wages',
        sortable: true,
        type: 'currency',
        format: (value) => `₹${Number(value).toLocaleString('en-IN')}`,
        width: '15%',
      },
      {
        key: 'base_wages',
        label: 'Base Wages',
        sortable: true,
        type: 'currency',
        format: (value) => `₹${Number(value).toLocaleString('en-IN')}`,
        width: '15%',
      },
      {
        key: 'overtime_wages',
        label: 'Overtime',
        sortable: true,
        type: 'currency',
        format: (value) => `₹${Number(value).toLocaleString('en-IN')}`,
        width: '15%',
      },
      {
        key: 'hours_worked',
        label: 'Hours',
        sortable: true,
        type: 'number',
        format: (value) => Number(value).toFixed(2),
        width: '15%',
      },
      {
        key: 'hourly_rate',
        label: 'Hourly Rate',
        sortable: true,
        type: 'currency',
        format: (value) => `₹${Number(value).toFixed(2)}`,
        width: '15%',
      },
    ];

    return baseColumns;
  }, [selectedGroupBy]);

  // Update export data whenever the data changes
  useEffect(() => {
    if (wagesData) {
      setExportData(wagesData);
      setReportName('Staff_Wages_Summary');
    }
  }, [wagesData, setExportData, setReportName]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!wagesData?.length) return null;

    const totalWages = wagesData.reduce((sum, item) => sum + (item.total_wages || 0), 0);
    const totalBaseWages = wagesData.reduce((sum, item) => sum + (item.base_wages || 0), 0);
    const totalOvertimeWages = wagesData.reduce((sum, item) => sum + (item.overtime_wages || 0), 0);
    const totalHours = wagesData.reduce((sum, item) => sum + (item.hours_worked || 0), 0);
    
    const avgHourlyRate = totalHours > 0 
      ? totalWages / totalHours 
      : wagesData.reduce((sum, item) => sum + (item.hourly_rate || 0), 0) / wagesData.length;

    return {
      totalWages,
      totalBaseWages,
      totalOvertimeWages,
      totalHours,
      avgHourlyRate,
    };
  }, [wagesData]);

  // Handle applying filters and closing dialog
  const handleApplyFilters = () => {
    refetch();
    setShowFilterDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Select
            value={selectedGroupBy}
            onValueChange={(value) => setSelectedGroupBy(value as GroupByOption)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Group by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="employee">By Staff Member</SelectItem>
              <SelectItem value="location">By Location</SelectItem>
              <SelectItem value="day">By Day</SelectItem>
              <SelectItem value="month">By Month</SelectItem>
              <SelectItem value="year">By Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Filter className="w-4 h-4 mr-2" />
                <span>Filters</span>
                {selectedLocation !== 'all' && (
                  <Badge variant="secondary" className="ml-2">1</Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Filter Options</DialogTitle>
              </DialogHeader>
        <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Select
                    value={selectedLocation}
                    onValueChange={setSelectedLocation}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button className="w-full" onClick={handleApplyFilters}>
                  Apply Filters
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      {summaryMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium flex justify-between">
                <span>Total Wages</span>
                <IndianRupee className="h-4 w-4" />
              </CardTitle>
            </CardHeader>            <CardContent>
              <div className="text-2xl font-bold">₹{summaryMetrics.totalWages.toLocaleString('en-IN')}</div>
              <p className="text-xs text-muted-foreground mt-1">
                For period: {currentDate}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium flex justify-between">
                <span>Total Hours</span>
                <Clock className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryMetrics.totalHours.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg Rate: ₹{summaryMetrics.avgHourlyRate.toFixed(2)}/hr
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium flex justify-between">
                <span>Base vs Overtime</span>
                <User className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex justify-between">
                <span>₹{summaryMetrics.totalBaseWages.toLocaleString('en-IN')}</span>
                <span className="text-gray-500">|</span>
                <span>₹{summaryMetrics.totalOvertimeWages.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex justify-between">
                <span>Base</span>
                <span>Overtime</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Table */}
      <ReportDataTable
        title="Staff Wages Summary"
        description="Detailed breakdown of wages by staff member, location, or time period"
        data={wagesData}
        columns={columns}
        loading={isLoading}
        exportFormats={['csv', 'excel']}
      />
    </div>
  );
}
