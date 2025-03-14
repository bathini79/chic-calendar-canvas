
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { DollarSign, CreditCard, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type RevenueBreakdown = {
  cash: number;
  card: number;
  online: number;
  total: number;
  tips: number;
  outstanding: number;
  collected: number;
};

export function DailyRevenue() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: revenue, isLoading } = useQuery({
    queryKey: ['daily-revenue', format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          total_price,
          payment_method,
          bookings (
            price_paid,
            original_price
          )
        `)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .eq('status', 'completed');

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

  const RevenueCard = ({ title, amount, icon: Icon, description }: { 
    title: string;
    amount: number;
    icon: React.ComponentType<any>;
    description?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">₹{amount.toFixed(2)}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  const LoadingCard = () => (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-[150px]" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-[100px]" />
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Daily Revenue</h2>
          <p className="text-muted-foreground">
            Financial overview for {format(selectedDate, 'MMMM d, yyyy')}
          </p>
        </div>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && setSelectedDate(date)}
          className="rounded-md border"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
          </>
        ) : (
          <>
            <RevenueCard
              title="Total Revenue"
              amount={revenue?.total || 0}
              icon={DollarSign}
              description="Total revenue for the day"
            />
            <RevenueCard
              title="Collected Payments"
              amount={revenue?.collected || 0}
              icon={Wallet}
              description="Successfully collected payments"
            />
            <RevenueCard
              title="Outstanding Balance"
              amount={revenue?.outstanding || 0}
              icon={CreditCard}
              description="Pending payments to be collected"
            />
            <RevenueCard
              title="Tips Collected"
              amount={revenue?.tips || 0}
              icon={DollarSign}
              description="Additional tips received"
            />
          </>
        )}
      </div>

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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
