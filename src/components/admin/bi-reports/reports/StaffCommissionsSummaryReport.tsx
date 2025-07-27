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
  BarChart3, 
  User,
  MapPin,
  Percent,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ReportDataTable, ReportColumn } from '../components/ReportDataTable';
import { useExportContext } from '../layout/ReportsLayout';
import { useCommissionFunctions } from '@/hooks/use-commission-functions';

// Group By options type
type GroupByOption = 'employee' | 'service' | 'location' | 'day' | 'month' | 'quarter' | 'year';

interface StaffCommissionsSummaryData {
  id: string;
  group_by_value: string;
  group_by_type: GroupByOption;
  total_commissions: number;
  total_sales: number;
  commission_percentage: number;
  service_count: number;
  employee_name?: string;
  service_name?: string;
  location_name?: string;
  date?: string;
}

interface LocationData {
  id: string;
  name: string;
}

export function StaffCommissionsSummaryReport() {
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
  }, []);  // Fetch staff commissions data
  const {
    data: commissionsData = [],
    isLoading,
    refetch,
  } = useQuery<StaffCommissionsSummaryData[]>({
    queryKey: ['staff-commissions', selectedGroupBy, selectedLocation],
    queryFn: async () => {
      // Instead of using a custom RPC, we'll fetch and process data from base tables
      // This approach directly queries the pay_run_items table for commission items

      // Build the SQL query based on the selected group by option
      let query = supabase
        .from('pay_run_items')
        .select(`
          id,
          employee_id,
          amount,
          compensation_type,
          source_type,
          source_id,
          created_at,
          employees!pay_run_items_employee_id_fkey (
            id,
            name,
            employee_locations!inner (
              location_id
            )
          )
        `)
        .eq('compensation_type', 'commission');

      // Apply location filter if needed
      if (selectedLocation !== 'all') {
        query = query.eq('employees.employee_locations.location_id', selectedLocation);
      }

      const { data: commissionItems, error: commissionError } = await query;

      if (commissionError) throw new Error(commissionError.message);

      // Get related appointments for sales data
      const appointmentIds = commissionItems
        .filter(item => item.source_type === 'appointment' && item.source_id)
        .map(item => item.source_id);

      // Fetch appointments if there are any appointment source IDs
      let appointmentData: any[] = [];
      if (appointmentIds.length > 0) {
        const { data: appointments, error: appointmentError } = await supabase
          .from('appointments')
          .select(`
            id,
            total_price,
            location,
            bookings (
              id,
              service_id,
              services (
                name
              )
            )
          `)
          .in('id', appointmentIds);

        if (appointmentError) throw new Error(appointmentError.message);
        appointmentData = appointments || [];
      }

      // Create a lookup map for appointments
      const appointmentMap = new Map();
      appointmentData.forEach(app => {
        appointmentMap.set(app.id, app);
      });

      // Process and group the data based on the selected grouping option
      const groupedData: Record<string, any> = {};

      commissionItems.forEach(item => {
        const employee = item.employees || {};
        const appointmentInfo = (item.source_type === 'appointment' && item.source_id) ? 
          appointmentMap.get(item.source_id) : null;
        
        // Determine the group key based on selected groupBy
        let groupKey = '';
        let groupName = '';
        let serviceName = 'All Services';
        let locationName = 'All Locations';

        if (selectedGroupBy === 'employee') {
          groupKey = employee.id || 'unknown';
          groupName = employee.name || 'Unknown';
        } 
        else if (selectedGroupBy === 'service' && appointmentInfo?.bookings?.[0]?.service_id) {
          groupKey = appointmentInfo.bookings[0].service_id;
          serviceName = appointmentInfo.bookings[0]?.services?.name || 'Unknown';
          groupName = serviceName;
        }
        else if (selectedGroupBy === 'location' && appointmentInfo?.location) {
          groupKey = appointmentInfo.location;
          locationName = appointmentInfo.location;
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
            service_name: serviceName,
            location_name: locationName,
            total_commissions: 0,
            total_sales: 0,
            service_count: 0
          };
        }

        // Sum up commissions
        groupedData[groupKey].total_commissions += parseFloat(item.amount) || 0;
        
        // Sum up sales and count services if appointment data exists
        if (appointmentInfo) {
          groupedData[groupKey].total_sales += parseFloat(appointmentInfo.total_price) || 0;
          groupedData[groupKey].service_count += appointmentInfo.bookings?.length || 0;
        }
      });

      // Convert to array and calculate commission percentage
      return Object.values(groupedData).map((item: any) => ({
        ...item,
        commission_percentage: item.total_sales > 0 ? 
          (item.total_commissions / item.total_sales) * 100 : 0,
        date: selectedGroupBy.match(/day|month|year/) ? item.group_by_value : 'N/A'
      }));
    },
    enabled: true,
  });

  // Define columns for the table
  const columns = useMemo<ReportColumn[]>(() => {
    const baseColumns: ReportColumn[] = [
      {
        key: 'group_by_value',
        label: selectedGroupBy === 'employee' ? 'Staff Member' 
             : selectedGroupBy === 'service' ? 'Service'
             : selectedGroupBy === 'location' ? 'Location'
             : 'Date',
        sortable: true,
        filterable: true,
        width: '25%',
        type: 'text',
      },
      {
        key: 'total_commissions',
        label: 'Total Commissions',
        sortable: true,
        type: 'currency',
        format: (value) => `₹${Number(value).toLocaleString('en-IN')}`,
        width: '20%',
      },
      {
        key: 'total_sales',
        label: 'Sales Amount',
        sortable: true,
        type: 'currency',
        format: (value) => `₹${Number(value).toLocaleString('en-IN')}`,
        width: '20%',
      },
      {
        key: 'commission_percentage',
        label: 'Commission %',
        sortable: true,
        type: 'percentage',
        format: (value) => `${Number(value).toFixed(2)}%`,
        width: '15%',
      },
      {
        key: 'service_count',
        label: 'Services',
        sortable: true,
        type: 'number',
        format: (value) => Number(value).toLocaleString('en-IN'),
        width: '15%',
      }
    ];

    return baseColumns;
  }, [selectedGroupBy]);

  // Update export data whenever the data changes
  useEffect(() => {
    if (commissionsData) {
      setExportData(commissionsData);
      setReportName('Staff_Commissions_Summary');
    }
  }, [commissionsData, setExportData, setReportName]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!commissionsData?.length) return null;

    const totalCommissions = commissionsData.reduce((sum, item) => sum + (item.total_commissions || 0), 0);
    const totalSales = commissionsData.reduce((sum, item) => sum + (item.total_sales || 0), 0);
    const avgCommissionPercent = totalSales > 0 
      ? (totalCommissions / totalSales) * 100
      : commissionsData.reduce((sum, item) => sum + (item.commission_percentage || 0), 0) / commissionsData.length;
    const totalServiceCount = commissionsData.reduce((sum, item) => sum + (item.service_count || 0), 0);
    
    return {
      totalCommissions,
      totalSales,
      avgCommissionPercent,
      totalServiceCount
    };
  }, [commissionsData]);

  // Handle applying filters and closing dialog
  const handleApplyFilters = () => {
    refetch();
    setShowFilterDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">

          <Select
            value={selectedGroupBy}
            onValueChange={(value) => setSelectedGroupBy(value as GroupByOption)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Group by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="employee">By Staff Member</SelectItem>
              <SelectItem value="service">By Service</SelectItem>
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
              </DialogHeader>              <div className="space-y-6 py-4"><div className="space-y-2">
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
                <span>Total Commissions</span>
                <IndianRupee className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{summaryMetrics.totalCommissions.toLocaleString('en-IN')}</div>
              <p className="text-xs text-muted-foreground mt-1">
                For period: {currentDate}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium flex justify-between">
                <span>Total Sales</span>
                <BarChart3 className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{summaryMetrics.totalSales.toLocaleString('en-IN')}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Services: {summaryMetrics.totalServiceCount}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium flex justify-between">
                <span>Average Commission</span>
                <Percent className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryMetrics.avgCommissionPercent.toFixed(2)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Of total sales value
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Table */}
      <ReportDataTable
        title="Staff Commissions Summary"
        description="Detailed breakdown of commissions by staff member, service, location, or time period"
        data={commissionsData}
        columns={columns}
        loading={isLoading}
        exportFormats={['csv', 'excel']}
      />
    </div>
  );
}
