import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ReportDataTable, ReportColumn } from '../components/ReportDataTable';
import { useExportContext } from '../layout/ReportsLayout';
import { Users, Star, Award, TrendingUp, BarChart, Table2, UserCheck, Filter, Calendar as CalendarIcon, MapPin, X, Check, Search } from 'lucide-react';

interface BookingData {
  id: string;
  sale_no: string;
  date: string;
  location: string;
  client: string;
  team_member: string;
  item: string;
  category: string;
  gross_sales: number;
  total_discounts: number;
  net_sales: number;
  taxes: number;
  total_sales: number;
  refunds: number;
  status: string;
  payment_method: string;
}

interface ServicePerformance {
  service_name: string;
  total_revenue: number;
  total_bookings: number;
  average_price: number;
  completion_rate: number;
}

interface EmployeePerformance {
  employee_name: string;
  total_revenue: number;
  total_bookings: number;
  average_booking_value: number;
  completion_rate: number;
}

export function SalesPerformanceAnalyticsReport() {
  const isMobile = useIsMobile();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ 
    from: new Date(), // Default to today
    to: new Date() 
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');  const [filters, setFilters] = useState<Record<string, any>>({
    employee: 'all',
    service: 'all',
    location: 'all',
    category: 'all',
    status: 'all',
    payment_method: 'all'
  });
  
  // Export context for sharing data with layout
  const { setExportData, setReportName } = useExportContext();
  // Fetch booking data with infinite scroll
  const {
    data: bookingsPages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  } = useInfiniteQuery({
    queryKey: ['sales-performance-bookings', dateRange, filters],
    queryFn: async ({ pageParam = 0 }) => {
      const startDate = dateRange?.from || subDays(new Date(), 30);
      const endDate = dateRange?.to || new Date();
      const pageSize = 50; // Fetch 50 records per page
      const offset = pageParam * pageSize;      let query = supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          customer_id,
          payment_method,
          total_price,
          tax_amount,
          discount_value,
          membership_discount,
          coupon_amount,
          points_discount_amount,
          referral_wallet_discount_amount,
          transaction_type,
          location,
          profiles:customer_id (
            full_name
          ),
          bookings!inner (
            id,
            price_paid,
            original_price,
            status,
            service_id,
            employee_id,
            created_at,            services (
              name,
              services_categories (
                categories (
                  name
                )
              )
            ),
            employees!bookings_employee_id_fkey (name)
          )
        `, { count: 'exact' })
        .gte('start_time', startOfDay(startDate).toISOString())
        .lte('start_time', endOfDay(endDate).toISOString())
        .not('bookings', 'is', null)
        .order('start_time', { ascending: false })
        .range(offset, offset + pageSize - 1);      // Apply filters
      if (filters.employee && filters.employee !== 'all') query = query.eq('bookings.employee_id', filters.employee);
      if (filters.service && filters.service !== 'all') query = query.eq('bookings.service_id', filters.service);
      if (filters.location && filters.location !== 'all') query = query.eq('location', filters.location);
      if (filters.status && filters.status !== 'all') query = query.eq('bookings.status', filters.status);
      if (filters.payment_method && filters.payment_method !== 'all') query = query.eq('payment_method', filters.payment_method);
      if (filters.category && filters.category !== 'all') query = query.eq('bookings.services.category_id', filters.category);

      const { data, error, count } = await query;
      if (error) throw error;      console.log(`Page ${pageParam}: Fetched ${data?.length || 0} records`);

      // Also fetch refunds for this appointment if any
      const appointmentIds = data?.map(appointment => appointment.id) || [];
      let refundsData = [];
      
      if (appointmentIds.length > 0) {
        const { data: refunds } = await supabase
          .from('appointments')
          .select('original_appointment_id, total_price')
          .eq('transaction_type', 'refund')
          .in('original_appointment_id', appointmentIds);
        
        refundsData = refunds || [];
      }

      // Fetch location names for appointments that have location IDs
      const locationIds = data?.map(appointment => appointment.location).filter(Boolean) || [];
      const uniqueLocationIds = [...new Set(locationIds)];
      let locationMap = new Map();
      
      if (uniqueLocationIds.length > 0) {
        const { data: locations } = await supabase
          .from('locations')
          .select('id, name')
          .in('id', uniqueLocationIds);
        
        if (locations) {
          locations.forEach(location => {
            locationMap.set(location.id, location.name);
          });
        }
      }

      const mappedData = data?.flatMap(appointment => {
        // Process each booking within the appointment
        return appointment.bookings.map((booking, index) => {
          // Calculate total discounts for this appointment
          const appointmentTotalDiscounts = (appointment.discount_value || 0) + 
                                          (appointment.membership_discount || 0) + 
                                          (appointment.coupon_amount || 0) + 
                                          (appointment.points_discount_amount || 0) + 
                                          (appointment.referral_wallet_discount_amount || 0);

          // Calculate total appointment gross sales to distribute discounts proportionally
          const appointmentGrossSales = appointment.bookings.reduce((total, b) => total + (b.original_price || b.price_paid || 0), 0);
          
          // Calculate this booking's proportion of total appointment
          const bookingGrossSales = booking.original_price || booking.price_paid || 0;
          const bookingProportion = appointmentGrossSales > 0 ? bookingGrossSales / appointmentGrossSales : 0;
          
          // Distribute discounts proportionally
          const bookingDiscounts = appointmentTotalDiscounts * bookingProportion;
          
          // Calculate this booking's proportion of taxes
          const bookingTaxes = (appointment.tax_amount || 0) * bookingProportion;

          // Calculate refunds for this appointment
          const refundAmount = refundsData
            .filter(refund => refund.original_appointment_id === appointment.id)
            .reduce((total, refund) => total + Math.abs(refund.total_price || 0), 0);

          // Calculate net sales (after discounts but before tax)
          const netSales = Math.max(0, bookingGrossSales - bookingDiscounts);
          
          // Calculate total sales for this booking (net sales + taxes)
          const totalSales = netSales + bookingTaxes;

          // Get location name from the map, fallback to the raw location value
          const locationName = appointment.location 
            ? locationMap.get(appointment.location) || appointment.location
            : 'Unknown Location';

          return {
            id: booking.id,
            sale_no: `TXN-${appointment.id.slice(-8).toUpperCase()}`,
            date: appointment.start_time,
            location: locationName,
            client: appointment.profiles?.full_name || 'Unknown Customer',
            team_member: booking.employees?.name || 'Unknown Employee',
            item: booking.services?.name || 'Unknown Service',
            category: booking.services?.services_categories?.[0]?.categories?.name || 'Uncategorized',
            gross_sales: bookingGrossSales,
            total_discounts: bookingDiscounts,
            net_sales: netSales,
            taxes: bookingTaxes,
            total_sales: totalSales,
            refunds: refundAmount * bookingProportion, // Distribute refunds proportionally
            status: booking.status || 'unknown',
            payment_method: appointment.payment_method || 'Not Specified'
          };
        });
      }) || [];

      return {
        data: mappedData,
        nextPage: data && data.length === pageSize ? pageParam + 1 : undefined,
        count: count || 0
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0
  });

  // Flatten all pages data
  const bookingsData = useMemo(() => {
    return bookingsPages?.pages.flatMap(page => page.data) || [];
  }, [bookingsPages]);

  // Get total count
  const totalCount = bookingsPages?.pages[0]?.count || 0;

  // Update export data and report name for the layout
  useEffect(() => {
    setExportData(bookingsData);
    setReportName('sales-performance-analytics');
  }, [bookingsData, setExportData, setReportName]);
  // Get unique values for filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['sales-performance-filter-options'],
    queryFn: async () => {      const [employeesRes, servicesRes, locationsRes, categoriesRes] = await Promise.all([
        supabase.from('employees').select('id, name').eq('status', 'active'),
        supabase.from('services').select('id, name').eq('status', 'active'),
        supabase.from('locations').select('id, name'),
        supabase.from('categories').select('id, name')
      ]);

      return {
        employees: employeesRes.data?.map(emp => ({ value: emp.id, label: emp.name })) || [],
        services: servicesRes.data?.map(srv => ({ value: srv.id, label: srv.name })) || [],
        locations: locationsRes.data?.map(loc => ({ value: loc.name, label: loc.name })) || [],
        categories: categoriesRes.data?.map(cat => ({ value: cat.id, label: cat.name })) || []
      };
    }
  });

  // Count active filters for badge
  const activeFiltersCount = Object.values(filters).filter(value => value && value !== 'all').length;
  // Column definitions for comprehensive sales report
  const bookingColumns: ReportColumn[] = [
    { key: 'sale_no', label: 'Sale No.', sortable: true, type: 'text' },
    { key: 'date', label: 'Date', sortable: true, type: 'date' },
    { key: 'location', label: 'Location', sortable: true, type: 'text' },
    { key: 'client', label: 'Client', sortable: true, type: 'text' },
    { key: 'team_member', label: 'Team Member', sortable: true, type: 'text' },
    { key: 'item', label: 'Item', sortable: true, type: 'text' },
    { key: 'category', label: 'Category', sortable: true, type: 'text' },
    { key: 'gross_sales', label: 'Gross Sales', sortable: true, type: 'currency' },
    { key: 'total_discounts', label: 'Total Discounts', sortable: true, type: 'currency' },
    { key: 'net_sales', label: 'Net Sales', sortable: true, type: 'currency' },
    { key: 'taxes', label: 'Taxes', sortable: true, type: 'currency' },
    { key: 'total_sales', label: 'Total Sales', sortable: true, type: 'currency' },
    { key: 'refunds', label: 'Refunds', sortable: true, type: 'currency' },
    { key: 'status', label: 'Status', sortable: true, type: 'badge' },
    { key: 'payment_method', label: 'Payment', sortable: true, type: 'text' }
  ];

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  const handleFilterReset = () => {
    setFilters({
      employee: 'all',
      service: 'all',
      location: 'all',
      category: 'all',
      status: 'all',
      payment_method: 'all'
    });
  };

  return (
    <div className="space-y-6">
      {/* Desktop: One row with Filters, Search, Date | Mobile: Two rows */}      <div className="space-y-4 sm:space-y-0">
        {/* Calendar and Filter aligned to the left */}        <div className="flex items-center justify-start gap-3">          {/* Calendar first */}          <DateRangePicker
            dateRange={dateRange}
            onChange={setDateRange}
            isMobile={isMobile}
            align="center"
            useDialogOnDesktop={true}
            dialogWidth="w-[600px] max-w-[90vw]"
            popoverWidth="w-[740px]"
            compact={false}
          />
          
          {/* Filter button second - icon only on mobile, with text on desktop */}
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={() => setFiltersOpen(true)}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="default" className="ml-1 px-1.5 py-0.5 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>      {/* Shared Filter Dialog for both Desktop and Mobile */}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg">Filter Sales Data</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Apply filters to narrow down the sales performance data.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-3 py-2 max-h-[50vh]">            <div className="space-y-1.5">
              <label className="text-sm font-medium">Location</label>
              <Select value={filters.location} onValueChange={(value) => handleFilterChange('location', value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {filterOptions?.locations?.map(loc => (
                    <SelectItem key={loc.value} value={loc.value}>{loc.label}</SelectItem>
                  )) || []}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Employee</label>
              <Select value={filters.employee} onValueChange={(value) => handleFilterChange('employee', value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  {filterOptions?.employees?.map(emp => (
                    <SelectItem key={emp.value} value={emp.value}>{emp.label}</SelectItem>
                  )) || []}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Service</label>
              <Select value={filters.service} onValueChange={(value) => handleFilterChange('service', value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All services</SelectItem>
                  {filterOptions?.services?.map(srv => (
                    <SelectItem key={srv.value} value={srv.value}>{srv.label}</SelectItem>
                  )) || []}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Category</label>
              <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {filterOptions?.categories?.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  )) || []}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status</label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={filters.payment_method} onValueChange={(value) => handleFilterChange('payment_method', value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All payment methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All payment methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>          </div>

          <div className="flex gap-2 pt-2 border-t mt-2">
            <Button variant="outline" onClick={handleFilterReset} className="flex-1 h-9">
              Reset
            </Button>
            <Button onClick={() => setFiltersOpen(false)} className="flex-1 h-9">
              Apply Filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>{/* Data Table */}
      <ReportDataTable        data={bookingsData || []}
        columns={bookingColumns}
        title=""
        searchPlaceholder=""
        loading={isLoading}
        externalSearchTerm=""
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        totalCount={totalCount}
        hideSearch={true}
      />
    </div>
  );
}
