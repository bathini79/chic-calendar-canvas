
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay } from 'date-fns';
import { DollarSign, CreditCard, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricCard } from '@/components/admin/dashboard/MetricCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DailyRevenueChart } from './DailyRevenueChart';
import ServiceRevenueChart from './ServiceRevenueChart';
import { RevenueDataTable } from './RevenueDataTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type RevenueBreakdown = {
  cash: number;
  card: number;
  online: number;
  total: number;
  tips: number;
  outstanding: number;
  collected: number;
};

interface DailyRevenueProps {
  expanded?: boolean;
  onExpand?: () => void;
  locations?: { id: string, name: string }[];
}

export function DailyRevenue({ expanded = false, onExpand, locations = [] }: DailyRevenueProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("summary");

  const { data: revenue, isLoading } = useQuery({
    queryKey: ['daily-revenue', format(selectedDate, 'yyyy-MM-dd'), selectedLocation],
    queryFn: async () => {
      const startOfDayTime = startOfDay(selectedDate);
      const endOfDayTime = endOfDay(selectedDate);
      
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
        .gte('start_time', startOfDayTime.toISOString())
        .lte('start_time', endOfDayTime.toISOString())
        .eq('status', 'completed');

      if (selectedLocation !== "all") {
        query = query.eq('location', selectedLocation);
      }

      const { data, error } = await query;

      if (error) throw error;

      const breakdown: RevenueBreakdown = {
        cash: 0,
        card: 0,
        online: 0,
        total: 0,
        tips: 0,
        outstanding: 0,
        collected: 0
      };

      data?.forEach(appointment => {
        const totalPrice = appointment.total_price || 0;
        
        // Calculate by payment method
        if (appointment.payment_method === 'cash') {
          breakdown.cash += totalPrice;
        } else if (appointment.payment_method === 'card') {
          breakdown.card += totalPrice;
        } else if (appointment.payment_method === 'online') {
          breakdown.online += totalPrice;
        }

        // Calculate totals and other metrics
        breakdown.total += totalPrice;
        
        // Calculate outstanding and collected amounts from bookings
        appointment.bookings?.forEach(booking => {
          const originalPrice = booking.original_price || 0;
          const pricePaid = booking.price_paid || 0;
          
          if (pricePaid > originalPrice) {
            breakdown.tips += pricePaid - originalPrice;
          }
          
          if (pricePaid < originalPrice) {
            breakdown.outstanding += originalPrice - pricePaid;
          }
          
          breakdown.collected += pricePaid;
        });
      });

      return breakdown;
    }
  });

  const handleFilterChange = (locationId: string) => {
    setSelectedLocation(locationId);
  };

  if (!expanded) {
    return (
      <Card 
        className="overflow-hidden hover:shadow-md transition-all cursor-pointer"
        onClick={onExpand}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Financial Overview</p>
            </div>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Daily Revenue</CardTitle>
          <CardDescription>Includes tips, outstanding balances, and collected payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-40 flex items-center justify-center bg-muted/30 rounded-md">
            <p className="text-muted-foreground text-center">
              Preview data will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Daily Revenue</h2>
        <p className="text-muted-foreground">
          Financial overview for {format(selectedDate, 'MMMM d, yyyy')}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Date Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Select
                value={selectedLocation}
                onValueChange={handleFilterChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-3 grid gap-4 grid-cols-1 md:grid-cols-3">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-[150px]" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-[100px]" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{revenue?.total.toFixed(2) || '0.00'}</div>
                  <p className="text-xs text-muted-foreground">Total revenue for the day</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Collected Payments</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{revenue?.collected.toFixed(2) || '0.00'}</div>
                  <p className="text-xs text-muted-foreground">Successfully collected payments</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tips Collected</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{revenue?.tips.toFixed(2) || '0.00'}</div>
                  <p className="text-xs text-muted-foreground">Additional tips received</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Payment Method Breakdown</CardTitle>
                <CardDescription>Revenue distribution by payment type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Cash Payments</span>
                    <span className="font-bold">₹{revenue?.cash.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Card Payments</span>
                    <span className="font-bold">₹{revenue?.card.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Online Payments</span>
                    <span className="font-bold">₹{revenue?.online.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium">Outstanding Balance</span>
                    <span className="font-bold">₹{revenue?.outstanding.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <DailyRevenueChart selectedDate={selectedDate} locationId={selectedLocation} />
          </div>
        </TabsContent>

        <TabsContent value="charts">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <DailyRevenueChart selectedDate={selectedDate} locationId={selectedLocation} />
            <ServiceRevenueChart selectedDate={selectedDate} locationId={selectedLocation} />
          </div>
        </TabsContent>

        <TabsContent value="data">
          <RevenueDataTable selectedDate={selectedDate} locationId={selectedLocation} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
