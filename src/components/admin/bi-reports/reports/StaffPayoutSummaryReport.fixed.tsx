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
  ArrowDownUp,
  CirclePlus,
  CircleMinus,
  CheckCircle2,
  User,
  Calendar,
  Clock,
  DollarSign,
  Wallet,
  CreditCard,
  Tag, 
  FileText,
  Package,
  Gift,
  PieChart,
  BarChart4,
  Coins,
  BadgePercent,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ReportDataTable, ReportColumn } from '../components/ReportDataTable';
import { useExportContext } from '../layout/ReportsLayout';

// Group By options type
type GroupByOption = 'employee' | 'location';

// Commission types
type CommissionType = 'service' | 'product' | 'membership' | 'package' | 'gift_card';

// Compensation types that match the database
type CompensationType = 'salary' | 'hourly' | 'regular' | 'overtime' | 'commission' | 'tips' | 'bonus' | 'adjustment';

// Detailed data structure for team payouts matching the screenshot
interface StaffPayoutDetailData {
  id: string;
  employeeId: string;
  employeeName: string;
  location?: string;
  
  // Overview section
  overview: {
    totalEarnings: number;
    totalWages: number;
    totalCommissions: number;
    totalTips: number;
    totalAdjustments: number;
    totalOther: number;
    grandTotal: number;
  };
  
  // Wages section with detailed breakdown
  wages: {
    regularHours: number;
    regularRate: number;
    regularAmount: number;
    overtimeHours: number;
    overtimeRate: number;
    overtimeAmount: number;
    totalHours: number;
    totalAmount: number;
  };
  
  // Commission sections with detailed breakdown by type
  commissions: {
    // Service commissions
    services: {
      sales: number;
      refunds: number;
      netSales: number;
      rate: number;
      commission: number;
    };
    
    // Product commissions
    products: {
      sales: number;
      refunds: number;
      netSales: number;
      rate: number;
      commission: number;
    };
    
    // Membership commissions
    memberships: {
      sales: number;
      refunds: number;
      netSales: number;
      rate: number;
      commission: number;
    };
    
    // Package commissions
    packages: {
      sales: number;
      refunds: number;
      netSales: number;
      rate: number;
      commission: number;
    };
    
    // Gift card commissions
    giftCards: {
      sales: number;
      refunds: number;
      netSales: number;
      rate: number;
      commission: number;
    };
    
    // Total commissions
    total: number;
  };
  
  // Tips section with detailed breakdown
  tips: {
    onlinePayments: number;
    posTerminal: number;
    cash: number;
    other: number;
    total: number;
  };
  
  // Earning adjustments section
  earningAdjustments: {
    bonuses: number;
    deductions: number;
    other: number;
    total: number;
  };
  
  // Other section
  other: {
    processingFees: number;
    newClientFees: number;
    additions: number;
    deductions: number;
    total: number;
  };
  
  // Payment Status
  paymentStatus: 'pending' | 'partially_paid' | 'paid';
  paidAmount: number;
  pendingAmount: number;
  
  // Pay period info
  payPeriod: {
    id: string;
    name: string;
    startDate: string; // ISO date
    endDate: string;   // ISO date
  };
}

// Simplified type for location data
interface LocationData {
  id: string;
  name: string;
}

// Simplified type for employee data
interface EmployeeData {
  id: string;
  name: string;
}

// Type for summary data shown in the main table
interface StaffPayoutSummaryData {
  id: string;
  group_by_value: string;
  group_by_type: string;
  employee_name: string;
  location_name: string;
  period_name: string;
  pay_date: string;
  total_payout: number;
  wages_amount: number;
  commission_amount: number;
  other_additions: number;
  other_deductions: number;
  paid_amount: number;
  pending_amount: number;
  payment_status: 'paid' | 'partially_paid' | 'pending';
}

export function StaffPayoutSummaryReport() { // Keeping the export name the same for compatibility
  const isMobile = useIsMobile();
  const { setExportData, setReportName } = useExportContext();  
  
  // States for filters and display
  const [selectedGroupBy, setSelectedGroupBy] = useState<'employee' | 'location'>('employee');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  
  // State to track currently selected staff member or pay period for detailed view
  const [detailedItemId, setDetailedItemId] = useState<string | null>(null);
  const [detailedData, setDetailedData] = useState<StaffPayoutDetailData | null>(null);
  
  // Fetch locations for filtering
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
  
  // Fetch employees list
  const { data: employees = [] } = useQuery<EmployeeData[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw new Error(error.message);
      return data || [];
    },
  });
  
  // Format date for display
  const currentDate = useMemo(() => {
    return format(new Date(), 'PP');
  }, []);
  
  // Since we're not using date filtering for Team reports, set a simple date range
  const formattedDateRange = useMemo(() => {
    return 'All time'; // Since we're removing date filtering from Team reports
  }, []);
  
  // Fetch staff payouts data - using mocked data since we don't have pay_run_items table
  const {
    data: payoutData = [],
    isLoading,
    refetch,
  } = useQuery<StaffPayoutSummaryData[]>({
    queryKey: ['staff-payouts', selectedGroupBy, selectedLocation, selectedEmployee],
    queryFn: async () => {
      // Generate mock data based on employees and locations
      // In a real implementation, you'd fetch from payroll tables or APIs
      let employeesList = [...employees];
      
      // Filter employees if a location is selected
      if (selectedLocation !== 'all') {
        // We'd need to get employees by location in a real implementation
        // For now, just return a subset for demo purposes
        employeesList = employeesList.slice(0, Math.floor(employeesList.length / 2));
      }
      
      // Filter by selected employee
      if (selectedEmployee !== 'all') {
        employeesList = employeesList.filter(e => e.id === selectedEmployee);
      }
      
      // Create groups based on the groupBy selection
      const groups: StaffPayoutSummaryData[] = [];
      
      if (selectedGroupBy === 'employee') {
        // Group by employee
        employeesList.forEach(employee => {
          // Generate random data for this employee
          const totalPayout = Math.random() * 50000 + 20000; // 20-70k
          const wagesAmount = totalPayout * 0.6;
          const commissionAmount = totalPayout * 0.25;
          const otherAdditions = totalPayout * 0.1;
          const otherDeductions = totalPayout * 0.05;
          const paidAmount = Math.random() > 0.3 ? totalPayout : totalPayout * 0.7;
          const pendingAmount = totalPayout - paidAmount;
          
          groups.push({
            id: employee.id,
            group_by_value: employee.name,
            group_by_type: 'employee',
            employee_name: employee.name,
            location_name: 'Salon Main',
            period_name: 'Current Period',
            pay_date: format(new Date(), 'PP'),
            total_payout: totalPayout,
            wages_amount: wagesAmount,
            commission_amount: commissionAmount,
            other_additions: otherAdditions,
            other_deductions: otherDeductions,
            paid_amount: paidAmount,
            pending_amount: pendingAmount,
            payment_status: pendingAmount === 0 ? 'paid' : 
                           paidAmount > 0 ? 'partially_paid' : 'pending'
          });
        });
      } else {
        // Group by location
        const locationGroups = new Map<string, StaffPayoutSummaryData>();
        
        // Use locations from query or a default set
        const locationsToShow = selectedLocation !== 'all' 
          ? locations.filter(l => l.id === selectedLocation)
          : locations;
          
        locationsToShow.forEach(location => {
          // Generate random data for this location
          const totalPayout = Math.random() * 200000 + 100000; // 100-300k
          const wagesAmount = totalPayout * 0.55;
          const commissionAmount = totalPayout * 0.3;
          const otherAdditions = totalPayout * 0.1;
          const otherDeductions = totalPayout * 0.05;
          const paidAmount = Math.random() > 0.3 ? totalPayout : totalPayout * 0.8;
          const pendingAmount = totalPayout - paidAmount;
          
          groups.push({
            id: location.id,
            group_by_value: location.name,
            group_by_type: 'location',
            employee_name: 'Various',
            location_name: location.name,
            period_name: 'Current Period',
            pay_date: format(new Date(), 'PP'),
            total_payout: totalPayout,
            wages_amount: wagesAmount,
            commission_amount: commissionAmount,
            other_additions: otherAdditions,
            other_deductions: otherDeductions,
            paid_amount: paidAmount,
            pending_amount: pendingAmount,
            payment_status: pendingAmount === 0 ? 'paid' : 
                           paidAmount > 0 ? 'partially_paid' : 'pending'
          });
        });
      }
      
      return groups;
    },
    enabled: true,
  });
  
  // Define columns for the table
  const columns = useMemo<ReportColumn[]>(() => {
    const baseColumns: ReportColumn[] = [
      {
        key: 'group_by_value',
        label: selectedGroupBy === 'employee' ? 'Team Member' : 'Location',
        sortable: true,
        type: 'text',
        width: '25%',
      },
      {
        key: 'total_payout',
        label: 'Total Payout',
        sortable: true,
        type: 'currency',
        width: '15%',
      },
      {
        key: 'wages_amount',
        label: 'Wages',
        sortable: true,
        type: 'currency',
        width: '15%',
      },
      {
        key: 'commission_amount',
        label: 'Commission',
        sortable: true,
        type: 'currency',
        width: '15%',
      },
      {
        key: 'paid_amount',
        label: 'Paid Amount',
        sortable: true,
        type: 'currency',
        width: '15%',
      },
      {
        key: 'pending_amount',
        label: 'Pending Amount',
        sortable: true,
        type: 'currency',
        width: '15%',
      }
    ];

    return baseColumns;
  }, [selectedGroupBy]);
  
  // Update export data whenever the data changes
  useEffect(() => {
    if (payoutData) {
      setExportData(payoutData);
      setReportName('Team_Payout_Summary');
    }
  }, [payoutData, setExportData, setReportName]);
  
  // Function to load detailed data for an item
  const loadDetailedData = async (itemId: string) => {
    // Find the row data first
    const row = payoutData.find(item => item.id === itemId);
    if (!row) return;
    
    let employeeId = '';
    let locationId = '';
    
    // Determine what data to fetch based on the grouping
    if (selectedGroupBy === 'employee') {
      employeeId = row.id;
      // In this case, we might want to get the latest pay period for this employee
      // For now, let's assume we're showing data for all pay periods combined
    }
    else if (selectedGroupBy === 'location') {
      locationId = row.id;
      // Here we'd get data across all employees at this location
    }
    
    try {
      // Get data from row
      let employeeName = row.employee_name || 'Team Member';
      let locationName = row.location_name || 'All Locations';
      
      // For demo purposes, generate detailed data based on the summary row
      // In a real implementation, you would fetch this from the database
      const detailData: StaffPayoutDetailData = {
        id: row.id,
        employeeId: employeeId || 'all',
        employeeName: employeeName,
        location: locationName,
        
        overview: {
          totalWages: row.wages_amount || 0,
          totalCommissions: row.commission_amount || 0,
          // For demo purposes, distribute "other" amounts reasonably
          totalTips: row.other_additions * 0.3 || 0,
          totalAdjustments: row.other_additions * 0.4 - row.other_deductions * 0.5 || 0,
          totalOther: row.other_additions * 0.3 - row.other_deductions * 0.5 || 0,
          totalEarnings: row.total_payout || 0,
          grandTotal: row.total_payout || 0
        },
        
        wages: {
          regularHours: 40, // Sample data
          regularRate: row.wages_amount ? (row.wages_amount / 40) : 250,
          regularAmount: row.wages_amount * 0.8 || 0, 
          overtimeHours: 5,  // Sample data
          overtimeRate: row.wages_amount ? (row.wages_amount / 40) * 1.5 : 375,
          overtimeAmount: row.wages_amount * 0.2 || 0,
          totalHours: 45,    // Sample data
          totalAmount: row.wages_amount || 0
        },
        
        commissions: {
          services: {
            sales: row.commission_amount * 3 || 0,
            refunds: row.commission_amount * 0.1 || 0,
            netSales: row.commission_amount * 2.9 || 0,
            rate: 0.15,
            commission: row.commission_amount * 0.6 || 0
          },
          
          products: {
            sales: row.commission_amount * 1.2 || 0,
            refunds: row.commission_amount * 0.05 || 0,
            netSales: row.commission_amount * 1.15 || 0,
            rate: 0.10,
            commission: row.commission_amount * 0.2 || 0
          },
          
          memberships: {
            sales: row.commission_amount * 0.8 || 0,
            refunds: 0,
            netSales: row.commission_amount * 0.8 || 0,
            rate: 0.08,
            commission: row.commission_amount * 0.1 || 0
          },
          
          packages: {
            sales: row.commission_amount * 0.5 || 0,
            refunds: 0,
            netSales: row.commission_amount * 0.5 || 0,
            rate: 0.12,
            commission: row.commission_amount * 0.06 || 0
          },
          
          giftCards: {
            sales: row.commission_amount * 0.3 || 0,
            refunds: 0,
            netSales: row.commission_amount * 0.3 || 0,
            rate: 0.05,
            commission: row.commission_amount * 0.04 || 0
          },
          
          total: row.commission_amount || 0
        },
        
        tips: {
          onlinePayments: row.other_additions * 0.15 || 0,
          posTerminal: row.other_additions * 0.08 || 0,
          cash: row.other_additions * 0.05 || 0,
          other: row.other_additions * 0.02 || 0,
          total: row.other_additions * 0.3 || 0
        },
        
        earningAdjustments: {
          bonuses: row.other_additions * 0.2 || 0,
          deductions: row.other_deductions * 0.3 || 0,
          other: row.other_additions * 0.2 || 0,
          total: (row.other_additions * 0.4) - (row.other_deductions * 0.3) || 0
        },
        
        other: {
          processingFees: row.other_deductions * 0.2 || 0,
          newClientFees: row.other_additions * 0.15 || 0,
          additions: row.other_additions * 0.15 || 0,
          deductions: row.other_deductions * 0.3 || 0,
          total: (row.other_additions * 0.3) - (row.other_deductions * 0.5) || 0
        },
        
        paymentStatus: row.payment_status as any,
        paidAmount: row.paid_amount || 0,
        pendingAmount: row.pending_amount || 0,
        
        payPeriod: {
          id: 'current',
          name: 'Current Period',
          startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First of current month
          endDate: new Date().toISOString().split('T')[0] // Today
        }
      };
      
      setDetailedData(detailData);
    } catch (error) {
      console.error("Error loading detailed staff payout data:", error);
    }
  };

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!payoutData?.length) return null;

    const totalPayout = payoutData.reduce((sum, item) => sum + (item.total_payout || 0), 0);
    const totalWages = payoutData.reduce((sum, item) => sum + (item.wages_amount || 0), 0);
    const totalCommission = payoutData.reduce((sum, item) => sum + (item.commission_amount || 0), 0);
    const totalPaid = payoutData.reduce((sum, item) => sum + (item.paid_amount || 0), 0);
    const totalPending = payoutData.reduce((sum, item) => sum + (item.pending_amount || 0), 0);
    const totalOtherAdditions = payoutData.reduce((sum, item) => sum + (item.other_additions || 0), 0);
    const totalOtherDeductions = payoutData.reduce((sum, item) => sum + (item.other_deductions || 0), 0);
    
    return {
      totalPayout,
      totalWages,
      totalCommission,
      totalPaid,
      totalPending,
      totalOtherAdditions,
      totalOtherDeductions
    };
  }, [payoutData]);

  // Handle applying filters and closing dialog
  const handleApplyFilters = () => {
    refetch();
    setShowFilterDialog(false);
  };
  
  // Get filter badge count
  const filterCount = useMemo(() => {
    let count = 0;
    if (selectedLocation !== 'all') count++;
    if (selectedEmployee !== 'all') count++;
    return count;
  }, [selectedLocation, selectedEmployee]);

  return (
    <div className="space-y-6">
      {/* Filter Bar */}      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">          
          <Select
            value={selectedGroupBy}
            onValueChange={(value) => setSelectedGroupBy(value as 'employee' | 'location')}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Group by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="employee">By Team Member</SelectItem>
              <SelectItem value="location">By Location</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Filter className="w-4 h-4 mr-2" />
                <span>Filters</span>
                {filterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{filterCount}</Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Filter Options</DialogTitle>
              </DialogHeader>              
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Team Member</label>
                  <Select
                    value={selectedEmployee}
                    onValueChange={setSelectedEmployee}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Team Members</SelectItem>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium flex justify-between">
                <span>Total Payouts</span>
                <IndianRupee className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{summaryMetrics.totalPayout.toLocaleString('en-IN')}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="inline-flex items-center">
                  <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                  Paid: ₹{summaryMetrics.totalPaid.toLocaleString('en-IN')}
                </span>
                <span className="mx-2">•</span>
                <span className="inline-flex items-center">
                  <Calendar className="h-3 w-3 mr-1 text-yellow-600" />
                  Pending: ₹{summaryMetrics.totalPending.toLocaleString('en-IN')}
                </span>
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium flex justify-between">
                <span>Wages vs Commissions</span>
                <ArrowDownUp className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex justify-between">
                <span>₹{summaryMetrics.totalWages.toLocaleString('en-IN')}</span>
                <span className="text-gray-500">|</span>
                <span>₹{summaryMetrics.totalCommission.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex justify-between">
                <span>Wages</span>
                <span>Commissions</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Table */}      
      <ReportDataTable
        title="Team Payout Summary Report"
        description={`${format(new Date(), 'PP')}`}
        data={payoutData}
        columns={columns}
        loading={isLoading}
        exportFormats={['csv', 'excel']}
        onRowClick={(row) => {
          setDetailedItemId(row.id);
          loadDetailedData(row.id);
          setShowDetailView(true);
        }}
      />

      {/* Detailed View Dialog */}
      {detailedData && (
        <Dialog open={showDetailView} onOpenChange={setShowDetailView}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">            
            <DialogHeader>
              <DialogTitle>Team Member Payout Details</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-full pr-4">
              {/* Staff and Period Info */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold flex items-center">                    
                    <User className="h-4 w-4 mr-2" />
                    Team Member
                  </h3>
                  <p className="text-lg font-medium">{detailedData.employeeName}</p>
                  {detailedData.location && <p className="text-sm text-muted-foreground">{detailedData.location}</p>}
                </div>
                <div>
                  <h3 className="text-sm font-semibold flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Pay Period
                  </h3>
                  <p className="text-lg font-medium">{detailedData.payPeriod.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(detailedData.payPeriod.startDate), 'PP')} - {format(parseISO(detailedData.payPeriod.endDate), 'PP')}
                  </p>
                </div>
              </div>

              {/* Payment Status Badge */}
              <div className="mb-6">
                <Badge className={
                  detailedData.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                  detailedData.paymentStatus === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }>
                  {detailedData.paymentStatus === 'paid' ? 'Paid' :
                   detailedData.paymentStatus === 'partially_paid' ? 'Partially Paid' :
                   'Pending'}
                </Badge>
                <div className="mt-2 flex items-center gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Paid: </span>
                    <span className="font-semibold">₹{detailedData.paidAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Pending: </span>
                    <span className="font-semibold">₹{detailedData.pendingAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Overview Section */}
              <Card className="mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <BarChart4 className="h-5 w-5 mr-2" />
                    Overview
                  </CardTitle>
                  <CardDescription>Summary of all earnings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Wages</p>
                      <p className="text-lg font-semibold">₹{detailedData.overview.totalWages.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Commissions</p>
                      <p className="text-lg font-semibold">₹{detailedData.overview.totalCommissions.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Tips</p>
                      <p className="text-lg font-semibold">₹{detailedData.overview.totalTips.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Adjustments</p>
                      <p className="text-lg font-semibold">₹{detailedData.overview.totalAdjustments.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Other</p>
                      <p className="text-lg font-semibold">₹{detailedData.overview.totalOther.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-semibold">Grand Total</p>
                      <p className="text-lg font-bold">₹{detailedData.overview.grandTotal.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Wages Section */}
              <Card className="mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Wages
                  </CardTitle>
                  <CardDescription>Regular and overtime wages</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Regular Hours</TableCell>
                        <TableCell className="text-right">{detailedData.wages.regularHours}</TableCell>
                        <TableCell className="text-right">₹{detailedData.wages.regularRate.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-right">₹{detailedData.wages.regularAmount.toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Overtime Hours</TableCell>
                        <TableCell className="text-right">{detailedData.wages.overtimeHours}</TableCell>
                        <TableCell className="text-right">₹{detailedData.wages.overtimeRate.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-right">₹{detailedData.wages.overtimeAmount.toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                      <TableRow className="font-semibold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">{detailedData.wages.totalHours}</TableCell>
                        <TableCell className="text-right"></TableCell>
                        <TableCell className="text-right">₹{detailedData.wages.totalAmount.toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Commissions Section */}
              <Card className="mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <BadgePercent className="h-5 w-5 mr-2" />
                    Commissions
                  </CardTitle>
                  <CardDescription>Commissions earned from sales</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Services Commissions */}
                  <div>
                    <h4 className="text-md font-medium mb-2 flex items-center">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Service Commissions
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Refunds</TableHead>
                          <TableHead className="text-right">Net Sales</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Commission</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>Services</TableCell>
                          <TableCell className="text-right">₹{detailedData.commissions.services.sales.toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-right text-red-500">-₹{detailedData.commissions.services.refunds.toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-right">₹{detailedData.commissions.services.netSales.toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-right">{(detailedData.commissions.services.rate * 100).toFixed(1)}%</TableCell>
                          <TableCell className="text-right font-semibold">₹{detailedData.commissions.services.commission.toLocaleString('en-IN')}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Products</TableCell>
                          <TableCell className="text-right">₹{detailedData.commissions.products.sales.toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-right text-red-500">-₹{detailedData.commissions.products.refunds.toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-right">₹{detailedData.commissions.products.netSales.toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-right">{(detailedData.commissions.products.rate * 100).toFixed(1)}%</TableCell>
                          <TableCell className="text-right font-semibold">₹{detailedData.commissions.products.commission.toLocaleString('en-IN')}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Memberships</TableCell>
                          <TableCell className="text-right">₹{detailedData.commissions.memberships.sales.toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-right text-red-500">-₹{detailedData.commissions.memberships.refunds.toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-right">₹{detailedData.commissions.memberships.netSales.toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-right">{(detailedData.commissions.memberships.rate * 100).toFixed(1)}%</TableCell>
                          <TableCell className="text-right font-semibold">₹{detailedData.commissions.memberships.commission.toLocaleString('en-IN')}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Packages</TableCell>
                          <TableCell className="text-right">₹{detailedData.commissions.packages.sales.toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-right text-red-500">-₹{detailedData.commissions.packages.refunds.toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-right">₹{detailedData.commissions.packages.netSales.toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-right">{(detailedData.commissions.packages.rate * 100).toFixed(1)}%</TableCell>
                          <TableCell className="text-right font-semibold">₹{detailedData.commissions.packages.commission.toLocaleString('en-IN')}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Gift Cards</TableCell>
                          <TableCell className="text-right">₹{detailedData.commissions.giftCards.sales.toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-right text-red-500">-₹{detailedData.commissions.giftCards.refunds.toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-right">₹{detailedData.commissions.giftCards.netSales.toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-right">{(detailedData.commissions.giftCards.rate * 100).toFixed(1)}%</TableCell>
                          <TableCell className="text-right font-semibold">₹{detailedData.commissions.giftCards.commission.toLocaleString('en-IN')}</TableCell>
                        </TableRow>
                        <TableRow className="font-bold">
                          <TableCell>Total Commissions</TableCell>
                          <TableCell colSpan={4}></TableCell>
                          <TableCell className="text-right">₹{detailedData.commissions.total.toLocaleString('en-IN')}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Tips Section */}
              <Card className="mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <Wallet className="h-5 w-5 mr-2" />
                    Tips
                  </CardTitle>
                  <CardDescription>Tips received across payment methods</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Online</p>
                      <p className="text-lg font-semibold">₹{detailedData.tips.onlinePayments.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">POS Terminal</p>
                      <p className="text-lg font-semibold">₹{detailedData.tips.posTerminal.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cash</p>
                      <p className="text-lg font-semibold">₹{detailedData.tips.cash.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Other</p>
                      <p className="text-lg font-semibold">₹{detailedData.tips.other.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Total Tips</p>
                    <p className="text-lg font-bold">₹{detailedData.tips.total.toLocaleString('en-IN')}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Adjustments Section */}
              <Card className="mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Adjustments
                  </CardTitle>
                  <CardDescription>Earning adjustments and bonuses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Bonuses</p>
                      <p className="text-lg font-semibold text-green-600">+₹{detailedData.earningAdjustments.bonuses.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Deductions</p>
                      <p className="text-lg font-semibold text-red-600">-₹{detailedData.earningAdjustments.deductions.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Other</p>
                      <p className="text-lg font-semibold">₹{detailedData.earningAdjustments.other.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Total Adjustments</p>
                    <p className="text-lg font-bold">₹{detailedData.earningAdjustments.total.toLocaleString('en-IN')}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Other Section */}
              <Card className="mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center">
                    <Tag className="h-5 w-5 mr-2" />
                    Other
                  </CardTitle>
                  <CardDescription>Additional earnings and deductions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Processing Fees</p>
                      <p className="text-lg font-semibold text-red-600">-₹{detailedData.other.processingFees.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">New Client Fees</p>
                      <p className="text-lg font-semibold text-green-600">+₹{detailedData.other.newClientFees.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Additions</p>
                      <p className="text-lg font-semibold text-green-600">+₹{detailedData.other.additions.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="col-span-1">
                      <p className="text-sm text-muted-foreground">Deductions</p>
                      <p className="text-lg font-semibold text-red-600">-₹{detailedData.other.deductions.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Net Other</p>
                    <p className="text-lg font-bold">₹{detailedData.other.total.toLocaleString('en-IN')}</p>
                  </div>
                </CardContent>
              </Card>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
