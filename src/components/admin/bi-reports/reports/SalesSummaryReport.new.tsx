import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useIsMobile } from '@/hooks/use-mobile';
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
import { BarChart3, Package, Filter, Calendar as CalendarIcon, MapPin, X, Users, ShoppingCart, Layers, Clock, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Group By options type
type GroupByOption = 'type' | 'category' | 'service' | 'team_member' | 'client' | 'location' | 'day' | 'month' | 'quarter' | 'year';

interface SalesSummaryData {
  id: string;
  group_by_value: string;
  group_by_type: GroupByOption;
  total_sales: number;
  gross_sales: number;
  total_discounts: number;
  net_sales: number;
  taxes: number;
  refunds: number;
  quantity_sold: number;
  avg_sale_value: number;
  sale_count: number;
}

interface ServiceSaleData {
  type: 'service';
  name: string;
  category: string;
  location: string;
  client: string;
  team_member: string;
  date: string;
  amount: number;
  gross_amount: number;
  discounts: number;
  taxes: number;
  refunds: number;
  quantity: number;
}

interface MembershipSaleData {
  type: 'membership';
  name: string;
  category: 'Membership';
  location: string;
  client: string;
  team_member: string;
  date: string;
  amount: number;
  gross_amount: number;
  discounts: number;
  taxes: number;
  refunds: number;
  quantity: number;
}

interface ItemSaleData {
  type: 'item';
  name: string;
  category: string;
  location: string;
  client: string;
  team_member: string;
  date: string;
  amount: number;
  gross_amount: number;
  discounts: number;
  taxes: number;
  refunds: number;
  quantity: number;
}

type SaleData = ServiceSaleData | MembershipSaleData | ItemSaleData;

export function SalesSummaryReport() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ 
    from: subDays(new Date(), 30), 
    to: new Date() 
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupBy, setGroupBy] = useState<GroupByOption>('type');
  const [filters, setFilters] = useState<Record<string, any>>({
    type: 'all',
    employee: 'all',
    location: 'all',
    category: 'all',
    client: 'all'
  });
  const isMobile = useIsMobile();
  // Export context for sharing data with layout
  const { setExportData, setReportName } = useExportContext();
  
  // Fetch locations for filter dropdown
  const { data: locations } = useQuery({
    queryKey: ['locations-for-sales-summary'],
    queryFn: async () => {
      const { data } = await supabase
        .from('locations')
        .select('id, name')
        .order('name');
      return data || [];
    }
  });

  // Helper function to fetch service sales
  const fetchServiceSales = async (startDate: Date, endDate: Date): Promise<ServiceSaleData[]> => {
    let query = supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        total_price,
        tax_amount,
        discount_value,
        membership_discount,
        coupon_amount,
        points_discount_amount,
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
          services (
            name
          ),
          employees!bookings_employee_id_fkey (name)
        )
      `)
      .gte('start_time', startOfDay(startDate).toISOString())
      .lte('start_time', endOfDay(endDate).toISOString())
      .eq('status', 'completed');

    // Apply filters
    if (filters.location && filters.location !== 'all') {
      query = query.eq('location', filters.location);
    }
    if (filters.employee && filters.employee !== 'all') {
      query = query.eq('bookings.employee_id', filters.employee);
    }

    const { data, error } = await query;
    if (error) {
      console.log('Service sales error:', error);
      return [];
    }

    // Get unique service IDs to fetch categories
    const uniqueServiceIds = [...new Set(
      data?.flatMap(appointment => 
        appointment.bookings?.map(booking => booking.service_id).filter(Boolean) || []
      ) || []
    )];

    // Fetch service categories if we have service IDs
    const serviceCategoryMap = new Map<string, string>();
    if (uniqueServiceIds.length > 0) {
      const { data: serviceCategories } = await supabase
        .from('services')
        .select(`
          id,
          services_categories!inner (
            categories!inner (
              name
            )
          )
        `)
        .in('id', uniqueServiceIds);
      
      if (serviceCategories) {
        serviceCategories.forEach(service => {
          const categoryName = service.services_categories?.[0]?.categories?.name || 'Uncategorized';
          serviceCategoryMap.set(service.id, categoryName);
        });
      }
    }

    return data?.flatMap(appointment => {
      return appointment.bookings?.map(booking => {
        const totalDiscounts = (appointment.discount_value || 0) + 
                             (appointment.membership_discount || 0) + 
                             (appointment.coupon_amount || 0) + 
                             (appointment.points_discount_amount || 0);

        const grossAmount = booking.original_price || booking.price_paid || 0;
        const netAmount = booking.price_paid || 0;
        const refunds = Math.max(0, grossAmount - netAmount - totalDiscounts);

        return {
          type: 'service' as const,
          name: booking.services?.name || 'Unknown Service',
          category: serviceCategoryMap.get(booking.service_id) || 'Uncategorized',
          location: appointment.location || 'Unknown Location',
          client: appointment.profiles?.full_name || 'Unknown Client',
          team_member: booking.employees?.name || 'Unknown Employee',
          date: appointment.start_time,
          amount: netAmount,
          gross_amount: grossAmount,
          discounts: totalDiscounts,
          taxes: appointment.tax_amount || 0,
          refunds: refunds,
          quantity: 1
        };
      }).filter(Boolean) || [];
    }) || [];
  };

  // Helper function to fetch membership sales
  const fetchMembershipSales = async (startDate: Date, endDate: Date): Promise<MembershipSaleData[]> => {
    let query = supabase
      .from('membership_sales')
      .select(`
        id,
        sale_date,
        total_amount,
        amount,
        tax_amount,
        customer_id,
        location_id,
        memberships (
          name
        ),
        locations!location_id (
          name
        )
      `)
      .gte('sale_date', startOfDay(startDate).toISOString())
      .lte('sale_date', endOfDay(endDate).toISOString())
      .eq('status', 'completed');

    // Apply filters
    if (filters.location && filters.location !== 'all') {
      query = query.eq('location_id', filters.location);
    }

    const { data, error } = await query;
    if (error) {
      console.log('Membership sales error:', error);
      return []; // Return empty array if there's an error (table might not exist)
    }

    // Get customer data separately
    const customerIds = data?.map(sale => sale.customer_id).filter(Boolean) || [];
    let customerData: any[] = [];
    
    if (customerIds.length > 0) {
      const { data: customers } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', customerIds);
      customerData = customers || [];
    }

    const customerMap = new Map(customerData.map(customer => [customer.id, customer]));

    return data?.map(sale => {
      const customer = customerMap.get(sale.customer_id);
      return {
        type: 'membership' as const,
        name: sale.memberships?.name || 'Unknown Membership',
        category: 'Membership' as const,
        location: sale.locations?.name || 'Unknown Location',
        client: customer?.full_name || 'Unknown Client',
        team_member: 'Sales Team',
        date: sale.sale_date,
        amount: sale.total_amount || 0,
        gross_amount: sale.amount || 0,
        discounts: Math.max(0, (sale.amount || 0) - (sale.total_amount || 0) + (sale.tax_amount || 0)),
        taxes: sale.tax_amount || 0,
        refunds: 0,
        quantity: 1
      };
    }) || [];
  };

  // Helper function to fetch item sales
  const fetchItemSales = async (startDate: Date, endDate: Date): Promise<ItemSaleData[]> => {
    try {
      // Use the RPC function to get comprehensive item sales data
      const { data, error } = await supabase.rpc('get_item_sales_data', {
        start_date: startOfDay(startDate).toISOString(),
        end_date: endOfDay(endDate).toISOString(),
        location_filter: filters.location && filters.location !== 'all' ? filters.location : null,
        employee_filter: filters.employee && filters.employee !== 'all' ? filters.employee : null
      });

      if (error) {
        console.log('Item sales RPC error:', error);
        return [];
      }

      // If data is null or not an array, return empty array
      if (!data || !Array.isArray(data)) {
        return [];
      }

      return data.map(sale => ({
        type: 'item' as const,
        name: sale.item_name || 'Unknown Item',
        category: sale.category_name || 'Uncategorized',
        location: sale.location_name || 'Unknown Location',
        client: sale.customer_name || 'Unknown Client',
        team_member: sale.employee_name || 'Sales Team',
        date: sale.sale_date,
        amount: Number(sale.final_amount) || 0,
        gross_amount: Number(sale.total_amount) || 0,
        discounts: Number(sale.discount_value) || 0,
        taxes: Number(sale.tax_amount) || 0,
        refunds: 0, // Refunds will be handled separately in future iterations
        quantity: sale.quantity || 1
      }));
    } catch (error) {
      console.log('Item sales fetch error:', error);
      return [];
    }
  };

  // Fetch all sales data
  const {
    data: rawSalesData,
    isLoading
  } = useQuery({
    queryKey: ['sales-summary', dateRange, filters],
    queryFn: async () => {
      const startDate = dateRange?.from || subDays(new Date(), 30);
      const endDate = dateRange?.to || new Date();

      // Fetch service sales data
      const serviceData = await fetchServiceSales(startDate, endDate);
      
      // Fetch membership sales data  
      const membershipData = await fetchMembershipSales(startDate, endDate);
      
      // Fetch item sales data (future implementation)
      const itemData = await fetchItemSales(startDate, endDate);

      // Combine all sales data
      const allSalesData: SaleData[] = [
        ...serviceData,
        ...membershipData,
        ...itemData
      ];

      return allSalesData;
    }
  });

  // Use raw sales data directly from the query
  const salesData = useMemo(() => {
    return rawSalesData || [];
  }, [rawSalesData]);

  // Summarize sales data by grouping
  const summarizedData = useMemo(() => {
    const groups = new Map<string, {
      total_sales: number;
      gross_sales: number;
      total_discounts: number;
      taxes: number;
      refunds: number;
      quantity_sold: number;
      sale_count: number;
    }>();

    salesData.forEach(sale => {
      let groupKey: string;
      let groupValue: string;

      switch (groupBy) {
        case 'type':
          groupKey = sale.type;
          groupValue = sale.type.charAt(0).toUpperCase() + sale.type.slice(1);
          break;
        case 'category':
          groupKey = sale.category;
          groupValue = sale.category;
          break;
        case 'service':
          groupKey = sale.name;
          groupValue = sale.name;
          break;
        case 'team_member':
          groupKey = sale.team_member;
          groupValue = sale.team_member;
          break;
        case 'client':
          groupKey = sale.client;
          groupValue = sale.client;
          break;
        case 'location':
          groupKey = sale.location;
          groupValue = sale.location;
          break;
        case 'day':
          const day = format(new Date(sale.date), 'yyyy-MM-dd');
          groupKey = day;
          groupValue = day;
          break;
        case 'month':
          const month = format(new Date(sale.date), 'yyyy-MM');
          groupKey = month;
          groupValue = month;
          break;
        case 'quarter':
          const quarter = `Q${Math.ceil((new Date(sale.date).getMonth() + 1) / 3)} ${new Date(sale.date).getFullYear()}`;
          groupKey = quarter;
          groupValue = quarter;
          break;
        case 'year':
          const year = new Date(sale.date).getFullYear().toString();
          groupKey = year;
          groupValue = year;
          break;
        default:
          groupKey = 'Unknown';
          groupValue = 'Unknown';
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          total_sales: 0,
          gross_sales: 0,
          total_discounts: 0,
          taxes: 0,
          refunds: 0,
          quantity_sold: 0,
          sale_count: 0
        });
      }

      const group = groups.get(groupKey)!;
      group.total_sales += sale.amount;
      group.gross_sales += sale.gross_amount;
      group.total_discounts += sale.discounts;
      group.taxes += sale.taxes;
      group.refunds += sale.refunds;
      group.quantity_sold += sale.quantity;
      group.sale_count += 1;
    });

    return Array.from(groups.entries()).map(([key, data]) => ({
      id: key,
      group_by_value: key,
      group_by_type: groupBy,
      ...data,
      net_sales: data.total_sales - data.total_discounts,
      avg_sale_value: data.sale_count > 0 ? data.total_sales / data.sale_count : 0
    }));
  }, [salesData, groupBy]);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return summarizedData;
    
    return summarizedData.filter(item =>
      item.group_by_value.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [summarizedData, searchTerm]);

  // Helper function to get group by label
  const getGroupByLabel = (option: GroupByOption): string => {
    const labels: Record<GroupByOption, string> = {
      type: 'Type',
      category: 'Category',
      service: 'Service',
      team_member: 'Team Member',
      client: 'Client',
      location: 'Location',
      day: 'Day',
      month: 'Month',
      quarter: 'Quarter',
      year: 'Year'
    };
    return labels[option] || option;
  };

  // Set up export data
  useEffect(() => {
    setExportData(filteredData);
    setReportName('sales-summary');
  }, [filteredData, setExportData, setReportName]);

  // Table columns
  const summaryColumns: ReportColumn[] = [
    { key: 'group_by_value', label: getGroupByLabel(groupBy), sortable: true, type: 'text' },
    { key: 'total_sales', label: 'Total Sales', sortable: true, type: 'currency' },
    { key: 'gross_sales', label: 'Gross Sales', sortable: true, type: 'currency' },
    { key: 'total_discounts', label: 'Discounts', sortable: true, type: 'currency' },
    { key: 'net_sales', label: 'Net Sales', sortable: true, type: 'currency' },
    { key: 'taxes', label: 'Taxes', sortable: true, type: 'currency' },
    { key: 'refunds', label: 'Refunds', sortable: true, type: 'currency' },
    { key: 'quantity_sold', label: 'Quantity', sortable: true, type: 'number' },
    { key: 'sale_count', label: 'Sale Count', sortable: true, type: 'number' },
    { key: 'avg_sale_value', label: 'Avg Sale Value', sortable: true, type: 'currency' }
  ];
  
  // Filter handlers
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleFilterReset = () => {
    setFilters({
      type: 'all',
      employee: 'all',
      location: 'all',
      category: 'all',
      client: 'all'
    });
  };

  const activeFiltersCount = Object.values(filters).filter(value => value && value !== 'all').length;

  return (
    <div className="space-y-6">
      {/* Desktop: One row with Group By, Filters, Search, Date | Mobile: Type, Calendar in first row, Filter, Search in second row */}
      <div className="space-y-4">
        {/* First row: Type, Calendar on mobile | All controls in one row on desktop */}
        <div className="flex justify-between items-center gap-3">
          {/* Group By Selector - always visible */}
          <div className="flex-1 sm:flex-none">
            <Select value={groupBy} onValueChange={(value: GroupByOption) => setGroupBy(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Group by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="type">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Type
                  </div>
                </SelectItem>
                <SelectItem value="category">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Category
                  </div>
                </SelectItem>
                <SelectItem value="service">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Service
                  </div>
                </SelectItem>
                <SelectItem value="team_member">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team Member
                  </div>
                </SelectItem>
                <SelectItem value="client">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Client
                  </div>
                </SelectItem>
                <SelectItem value="location">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </div>
                </SelectItem>
                <SelectItem value="day">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Day
                  </div>
                </SelectItem>
                <SelectItem value="month">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Month
                  </div>
                </SelectItem>
                <SelectItem value="quarter">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Quarter
                  </div>
                </SelectItem>
                <SelectItem value="year">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Year
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Common DateRangePicker for both mobile and desktop */}
          <DateRangePicker
            dateRange={dateRange}
            onChange={setDateRange}
            isMobile={isMobile}
            align={isMobile ? "end" : "center"}
            className="flex-1 sm:flex-none"
          />

          {/* Desktop: Filters and Search - only shown on desktop */}
          <div className="hidden sm:flex sm:items-center sm:gap-3 sm:flex-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={() => setFiltersOpen(true)}
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <Badge variant="default" className="ml-1 px-1.5 py-0.5 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>

            <div className="relative flex-1 max-w-[260px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${getGroupByLabel(groupBy).toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </div>

        {/* Second row: Filter, Search on mobile - only shown on mobile */}
        <div className="flex items-center gap-3 sm:hidden">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={() => setFiltersOpen(true)}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="default" className="ml-1 px-1.5 py-0.5 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${getGroupByLabel(groupBy).toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      </div>

      {/* Shared Filter Dialog for both Desktop and Mobile */}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Sales Data</DialogTitle>
            <DialogDescription>
              Apply filters to refine your sales analysis
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sale Type</label>
              <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="service">Services</SelectItem>
                  <SelectItem value="membership">Memberships</SelectItem>
                  <SelectItem value="item">Items</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Select 
                value={filters.location} 
                onValueChange={(value) => handleFilterChange('location', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations?.map(location => (
                    <SelectItem key={location.id} value={location.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {location.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleFilterReset} className="flex-1">
              Reset
            </Button>
            <Button onClick={() => setFiltersOpen(false)} className="flex-1">
              Apply Filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Data Table */}
      <ReportDataTable
        data={filteredData}
        columns={summaryColumns}
        title=""
        searchPlaceholder="Search by client, service, location, or team member..."
        loading={isLoading}
        externalSearchTerm={searchTerm}
        totalCount={filteredData.length}
      />
    </div>
  );
}
