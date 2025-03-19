
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Calendar as CalendarIcon, Download, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FinancialSummaryProps {
  expanded?: boolean;
  onBack?: () => void;
  locations?: Array<{ id: string; name: string }>;
}

// Sample data for demonstration
const generateSampleData = () => {
  // Define sample data for revenue
  const salesData = [
    { month: 'January', revenue: 125000, count: 250 },
    { month: 'February', revenue: 143000, count: 275 },
    { month: 'March', revenue: 162000, count: 310 },
    { month: 'April', revenue: 189000, count: 340 },
    { month: 'May', revenue: 210000, count: 380 },
    { month: 'June', revenue: 231000, count: 410 },
    { month: 'July', revenue: 189000, count: 350 },
    { month: 'August', revenue: 195000, count: 360 },
    { month: 'September', revenue: 205000, count: 370 },
    { month: 'October', revenue: 220000, count: 390 },
    { month: 'November', revenue: 240000, count: 420 },
    { month: 'December', revenue: 260000, count: 450 },
  ];

  // Define sample data for payments
  const paymentsData = [
    { month: 'January', cash: 75000, online: 50000 },
    { month: 'February', cash: 83000, online: 60000 },
    { month: 'March', cash: 92000, online: 70000 },
    { month: 'April', cash: 99000, online: 90000 },
    { month: 'May', cash: 110000, online: 100000 },
    { month: 'June', cash: 121000, online: 110000 },
    { month: 'July', cash: 99000, online: 90000 },
    { month: 'August', cash: 95000, online: 100000 },
    { month: 'September', cash: 105000, online: 100000 },
    { month: 'October', cash: 110000, online: 110000 },
    { month: 'November', cash: 130000, online: 110000 },
    { month: 'December', cash: 140000, online: 120000 },
  ];

  // Define sample data for redemptions
  const redemptionsData = [
    { month: 'January', memberships: 15000, packages: 20000, coupons: 5000 },
    { month: 'February', memberships: 18000, packages: 22000, coupons: 7000 },
    { month: 'March', memberships: 20000, packages: 25000, coupons: 8000 },
    { month: 'April', memberships: 22000, packages: 28000, coupons: 9000 },
    { month: 'May', memberships: 25000, packages: 30000, coupons: 10000 },
    { month: 'June', memberships: 28000, packages: 32000, coupons: 12000 },
    { month: 'July', memberships: 24000, packages: 30000, coupons: 10000 },
    { month: 'August', memberships: 25000, packages: 31000, coupons: 11000 },
    { month: 'September', memberships: 26000, packages: 32000, coupons: 12000 },
    { month: 'October', memberships: 27000, packages: 33000, coupons: 13000 },
    { month: 'November', memberships: 29000, packages: 35000, coupons: 14000 },
    { month: 'December', memberships: 32000, packages: 38000, coupons: 15000 },
  ];

  return { salesData, paymentsData, redemptionsData };
};

const FinancialSummary: React.FC<FinancialSummaryProps> = ({ expanded = false, onBack, locations = [] }) => {
  const [dateRange, setDateRange] = useState<"1M" | "3M" | "6M" | "1Y" | "custom">("1M");
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"sales" | "payments" | "redemptions">("sales");

  // Generate sample data
  const { salesData, paymentsData, redemptionsData } = generateSampleData();

  // Handle date range changes
  const handleDateRangeChange = (range: "1M" | "3M" | "6M" | "1Y" | "custom") => {
    setDateRange(range);
    
    const now = new Date();
    
    if (range === "1M") {
      setStartDate(startOfMonth(now));
      setEndDate(endOfMonth(now));
    } else if (range === "3M") {
      setStartDate(startOfMonth(subMonths(now, 2)));
      setEndDate(endOfMonth(now));
    } else if (range === "6M") {
      setStartDate(startOfMonth(subMonths(now, 5)));
      setEndDate(endOfMonth(now));
    } else if (range === "1Y") {
      setStartDate(startOfYear(now));
      setEndDate(endOfYear(now));
    }
    // If "custom", we don't change the dates automatically
  };

  // Format date for display
  const formatDateRange = () => {
    return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
  };

  return (
    <Card className={expanded ? "w-full" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        {expanded && onBack && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        )}
        <CardTitle className="text-xl">Financial Overview</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" /> Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={dateRange} onValueChange={(value) => handleDateRangeChange(value as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1M">This Month</SelectItem>
                <SelectItem value="3M">Last 3 Months</SelectItem>
                <SelectItem value="6M">Last 6 Months</SelectItem>
                <SelectItem value="1Y">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            
            {dateRange === "custom" && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[130px] justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'MMM d, yyyy') : <span>Start date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span>-</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[130px] justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'MMM d, yyyy') : <span>End date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
            
            {dateRange !== "custom" && (
              <div className="flex items-center h-10 px-4 border rounded-md">
                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{formatDateRange()}</span>
              </div>
            )}
          </div>
          
          <Select value={selectedLocation || ""} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Locations</SelectItem>
              {locations.map(location => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sales" className="mt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Sales Count</TableHead>
                    <TableHead className="text-right">Average Sale</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesData.map((item) => (
                    <TableRow key={item.month}>
                      <TableCell className="font-medium">{item.month}</TableCell>
                      <TableCell className="text-right">₹{item.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{item.count}</TableCell>
                      <TableCell className="text-right">
                        ₹{(item.revenue / item.count).toFixed(0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="payments" className="mt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Cash</TableHead>
                    <TableHead className="text-right">Online</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsData.map((item) => (
                    <TableRow key={item.month}>
                      <TableCell className="font-medium">{item.month}</TableCell>
                      <TableCell className="text-right">₹{item.cash.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{item.online.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        ₹{(item.cash + item.online).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="redemptions" className="mt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Memberships</TableHead>
                    <TableHead className="text-right">Packages</TableHead>
                    <TableHead className="text-right">Coupons</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redemptionsData.map((item) => (
                    <TableRow key={item.month}>
                      <TableCell className="font-medium">{item.month}</TableCell>
                      <TableCell className="text-right">₹{item.memberships.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{item.packages.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{item.coupons.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        ₹{(item.memberships + item.packages + item.coupons).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FinancialSummary;
