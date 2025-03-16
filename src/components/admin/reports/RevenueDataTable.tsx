
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from '@/components/ui/dialog';

interface RevenueDataTableProps {
  selectedDate: Date;
  locationId?: string;
}

type RevenueData = {
  date: string;
  bookingCount: number;
  revenue: number;
  tips: number;
  totalOutstanding: number;
  collectedOutstanding: number;
};

export function RevenueDataTable({ selectedDate, locationId }: RevenueDataTableProps) {
  const [open, setOpen] = useState(false);
  const [timePeriod, setTimePeriod] = useState('month');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['revenue-data-table', format(selectedDate, 'yyyy-MM'), timePeriod, locationId],
    queryFn: async () => {
      let startDate, endDate;
      
      if (timePeriod === 'day') {
        startDate = startOfDay(selectedDate);
        endDate = endOfDay(selectedDate);
      } else if (timePeriod === 'month') {
        startDate = startOfMonth(selectedDate);
        endDate = endOfMonth(selectedDate);
      } else {
        // Default to month
        startDate = startOfMonth(selectedDate);
        endDate = endOfMonth(selectedDate);
      }

      const days = eachDayOfInterval({ start: startDate, end: endDate });
      
      const result: RevenueData[] = [];
      let totalBookings = 0;
      let totalRevenue = 0;
      let totalTips = 0;
      let totalOutstandingAmount = 0;
      let totalCollectedOutstanding = 0;

      for (const day of days) {
        const start = startOfDay(day).toISOString();
        const end = endOfDay(day).toISOString();
        
        let query = supabase
          .from('appointments')
          .select(`
            id,
            total_price,
            payment_method,
            location,
            bookings (
              id,
              price_paid,
              original_price
            )
          `)
          .gte('start_time', start)
          .lte('start_time', end)
          .eq('status', 'completed');

        if (locationId && locationId !== "all") {
          query = query.eq('location', locationId);
        }

        const { data: appointments, error } = await query;
        
        if (error) {
          console.error('Error fetching revenue data:', error);
          throw error;
        }

        const bookingCount = appointments.reduce((sum, appointment) => sum + (appointment.bookings?.length || 0), 0);
        const revenue = appointments.reduce((sum, appointment) => sum + (appointment.total_price || 0), 0);
        
        let tips = 0;
        let outstanding = 0;
        let collected = 0;
        
        appointments.forEach(appointment => {
          appointment.bookings?.forEach(booking => {
            const originalPrice = booking.original_price || 0;
            const pricePaid = booking.price_paid || 0;
            
            if (pricePaid > originalPrice) {
              tips += pricePaid - originalPrice;
            }
            
            if (pricePaid < originalPrice) {
              outstanding += originalPrice - pricePaid;
            }
            
            collected += pricePaid;
          });
        });

        result.push({
          date: format(day, 'yyyy-MM-dd'),
          bookingCount,
          revenue,
          tips,
          totalOutstanding: outstanding,
          collectedOutstanding: collected
        });

        totalBookings += bookingCount;
        totalRevenue += revenue;
        totalTips += tips;
        totalOutstandingAmount += outstanding;
        totalCollectedOutstanding += collected;
      }

      // Add total row
      result.push({
        date: 'Total',
        bookingCount: totalBookings,
        revenue: totalRevenue,
        tips: totalTips,
        totalOutstanding: totalOutstandingAmount,
        collectedOutstanding: totalCollectedOutstanding
      });

      return result;
    }
  });

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!data || !sortField) return data;
    
    return [...data].sort((a, b) => {
      if (a.date === 'Total') return 1;
      if (b.date === 'Total') return -1;
      
      let comparison = 0;
      if (sortField === 'date') {
        comparison = a.date.localeCompare(b.date);
      } else {
        comparison = (a[sortField as keyof RevenueData] as number) - (b[sortField as keyof RevenueData] as number);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const exportToCSV = () => {
    if (!data) return;
    
    // Prepare CSV content
    const headers = ['Date', 'Booking Count', 'Revenue', 'Tips', 'Total Outstanding', 'Collected Outstanding'];
    const csvContent = [
      headers.join(','),
      ...data.map(row => [
        row.date,
        row.bookingCount,
        row.revenue,
        row.tips,
        row.totalOutstanding,
        row.collectedOutstanding
      ].join(','))
    ].join('\n');
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `revenue-report-${format(selectedDate, 'yyyy-MM')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Revenue Data</CardTitle>
            <CardDescription>Detailed revenue breakdown for {format(selectedDate, 'MMMM yyyy')}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timePeriod} onValueChange={setTimePeriod}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setOpen(true)} variant="outline" size="sm">
              View All
            </Button>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>Revenue data for {format(selectedDate, 'MMMM yyyy')}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Date {renderSortIcon('date')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer text-right"
                  onClick={() => handleSort('bookingCount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Booking Count {renderSortIcon('bookingCount')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer text-right"
                  onClick={() => handleSort('revenue')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Revenue {renderSortIcon('revenue')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer text-right"
                  onClick={() => handleSort('tips')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Tips {renderSortIcon('tips')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData?.slice(0, 8).map((row, index) => (
                <TableRow key={index} className={row.date === 'Total' ? 'font-bold bg-muted/30' : ''}>
                  <TableCell>{row.date === 'Total' ? 'Total' : format(new Date(row.date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell className="text-right">{row.bookingCount}</TableCell>
                  <TableCell className="text-right">₹{row.revenue.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{row.tips.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Detailed Revenue Report - {format(selectedDate, 'MMMM yyyy')}</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Date {renderSortIcon('date')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer text-right"
                  onClick={() => handleSort('bookingCount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Booking Count {renderSortIcon('bookingCount')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer text-right"
                  onClick={() => handleSort('revenue')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Revenue {renderSortIcon('revenue')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer text-right"
                  onClick={() => handleSort('tips')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Tips {renderSortIcon('tips')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer text-right"
                  onClick={() => handleSort('totalOutstanding')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Outstanding {renderSortIcon('totalOutstanding')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer text-right"
                  onClick={() => handleSort('collectedOutstanding')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Collected {renderSortIcon('collectedOutstanding')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData?.map((row, index) => (
                <TableRow key={index} className={row.date === 'Total' ? 'font-bold bg-muted/30' : ''}>
                  <TableCell>{row.date === 'Total' ? 'Total' : format(new Date(row.date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell className="text-right">{row.bookingCount}</TableCell>
                  <TableCell className="text-right">₹{row.revenue.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{row.tips.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{row.totalOutstanding.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{row.collectedOutstanding.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DialogFooter>
            <Button onClick={exportToCSV} className="ml-auto">
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
