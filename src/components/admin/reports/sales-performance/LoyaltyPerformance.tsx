import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRange } from 'react-day-picker';
import { format, subDays } from 'date-fns';
import { Coins, TrendingUp, TrendingDown, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

type LoyaltyPerformanceProps = {
  employeeId: string;
  dateRange: "30" | "90" | "365" | "custom";
};

export const LoyaltyPerformance = ({ employeeId, dateRange }: LoyaltyPerformanceProps) => {
  const [dateRangeValue, setDateRangeValue] = useState<DateRange | undefined>();
  
  // Prepare date range based on selected option
  useEffect(() => {
    const endDate = new Date();
    let startDate;
    
    if (dateRange === "30") {
      startDate = subDays(endDate, 30);
    } else if (dateRange === "90") {
      startDate = subDays(endDate, 90);
    } else if (dateRange === "365") {
      startDate = subDays(endDate, 365);
    } else {
      // Custom - Keep existing date range or default to 30 days
      if (!dateRangeValue) {
        startDate = subDays(endDate, 30);
      } else {
        return; // Custom date range already set
      }
    }
    
    setDateRangeValue({
      from: startDate,
      to: endDate
    });
  }, [dateRange]);

  // Get appointments with loyalty points data
  const { data: loyaltyData, isLoading } = useQuery({
    queryKey: ['loyalty-performance', dateRangeValue?.from, dateRangeValue?.to, employeeId],
    queryFn: async () => {
      if (!dateRangeValue?.from || !dateRangeValue?.to) return null;
      
      const startDate = format(dateRangeValue.from, 'yyyy-MM-dd');
      const endDate = format(dateRangeValue.to, 'yyyy-MM-dd');
      
      // Query to include appointments with employee filter if needed
      let query = supabase
        .from('appointments')
        .select(`
          id,
          customer_id,
          start_time,
          points_earned,
          points_redeemed,
          points_discount_amount,
          total_price,
          bookings(employee_id)
        `)
        .gte('start_time', `${startDate}T00:00:00`)
        .lte('start_time', `${endDate}T23:59:59`);
      
      if (employeeId !== "all") {
        query = query.filter('bookings.employee_id', 'eq', employeeId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching loyalty data:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!dateRangeValue?.from && !!dateRangeValue?.to
  });

  // Get loyalty settings
  const { data: loyaltySettings } = useQuery({
    queryKey: ['loyalty-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_program_settings')
        .select('*')
        .single();
      
      if (error) {
        console.error('Error fetching loyalty settings:', error);
        return null;
      }
      
      return data;
    }
  });

  // Calculate summary metrics
  const calculateMetrics = () => {
    if (!loyaltyData) return {
      totalPointsEarned: 0,
      totalPointsRedeemed: 0,
      totalDiscountAmount: 0,
      avgPointsPerTransaction: 0,
      avgDiscountPerRedemption: 0,
      redemptionRate: 0,
      redemptionCount: 0,
      totalTransactions: 0
    };
    
    const totalTransactions = loyaltyData.length;
    const totalPointsEarned = loyaltyData.reduce((sum, item) => 
      sum + (item.points_earned || 0), 0);
    
    const redemptionItems = loyaltyData.filter(item => item.points_redeemed && item.points_redeemed > 0);
    const redemptionCount = redemptionItems.length;
    
    const totalPointsRedeemed = loyaltyData.reduce((sum, item) => 
      sum + (item.points_redeemed || 0), 0);
    
    const totalDiscountAmount = loyaltyData.reduce((sum, item) => 
      sum + (item.points_discount_amount || 0), 0);
    
    const avgPointsPerTransaction = totalTransactions > 0 ? 
      totalPointsEarned / totalTransactions : 0;
    
    const avgDiscountPerRedemption = redemptionCount > 0 ? 
      totalDiscountAmount / redemptionCount : 0;
    
    const redemptionRate = totalTransactions > 0 ? 
      (redemptionCount / totalTransactions) * 100 : 0;
    
    return {
      totalPointsEarned,
      totalPointsRedeemed,
      totalDiscountAmount,
      avgPointsPerTransaction,
      avgDiscountPerRedemption,
      redemptionRate,
      redemptionCount,
      totalTransactions
    };
  };

  const metrics = calculateMetrics();

  // Prepare chart data
  const prepareChartData = () => {
    if (!loyaltyData) return [];
    
    // Group by day
    const groupedByDay = loyaltyData.reduce((acc, item) => {
      const day = item.start_time ? format(new Date(item.start_time), 'yyyy-MM-dd') : 'unknown';
      
      if (!acc[day]) {
        acc[day] = {
          day,
          pointsEarned: 0,
          pointsRedeemed: 0,
          discountAmount: 0,
          count: 0
        };
      }
      
      acc[day].pointsEarned += (item.points_earned || 0);
      acc[day].pointsRedeemed += (item.points_redeemed || 0);
      acc[day].discountAmount += (item.points_discount_amount || 0);
      acc[day].count += 1;
      
      return acc;
    }, {});
    
    // Convert to array and sort by day
    return Object.values(groupedByDay)
      .sort((a: any, b: any) => a.day.localeCompare(b.day));
  };

  const chartData = prepareChartData();

  // Prepare pie chart data for redemption vs non-redemption
  const redemptionPieData = [
    { name: 'With Points Redemption', value: metrics.redemptionCount },
    { name: 'Without Points Redemption', value: metrics.totalTransactions - metrics.redemptionCount }
  ];

  const COLORS = ['#0088FE', '#FFBB28'];

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points Earned</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-[100px]" />
            ) : (
              <div className="text-2xl font-bold">{Math.round(metrics.totalPointsEarned).toLocaleString()}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points Redeemed</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-[100px]" />
            ) : (
              <div className="text-2xl font-bold">{Math.round(metrics.totalPointsRedeemed).toLocaleString()}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Discount Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-[100px]" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(metrics.totalDiscountAmount)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Redemption Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-[100px]" />
            ) : (
              <div className="text-2xl font-bold">{metrics.redemptionRate.toFixed(1)}%</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Loyalty Program Settings</CardTitle>
          </CardHeader>
          <CardContent>
            {!loyaltySettings ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Program Status</h4>
                  <div className="flex items-center mt-1">
                    <div className={`h-3 w-3 rounded-full mr-2 ${loyaltySettings.enabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span>{loyaltySettings.enabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium">Points Configuration</h4>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <span className="text-muted-foreground text-sm">Points Per ₹100 Spent:</span>
                      <p className="font-medium">{loyaltySettings.points_per_spend || 'Not set'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">Min Redemption Points:</span>
                      <p className="font-medium">{loyaltySettings.min_redemption_points || 'Not set'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">Points Validity:</span>
                      <p className="font-medium">{loyaltySettings.points_validity_days ? `${loyaltySettings.points_validity_days} days` : 'Never expires'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">Min Billing Amount:</span>
                      <p className="font-medium">{loyaltySettings.min_billing_amount ? `₹${loyaltySettings.min_billing_amount}` : 'None'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium">Redemption Limits</h4>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <span className="text-muted-foreground text-sm">Max Redemption Type:</span>
                      <p className="font-medium capitalize">{loyaltySettings.max_redemption_type || 'None'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-sm">Max Value:</span>
                      <p className="font-medium">
                        {loyaltySettings.max_redemption_type === 'fixed' && loyaltySettings.max_redemption_points 
                          ? `${loyaltySettings.max_redemption_points} points` 
                          : loyaltySettings.max_redemption_type === 'percentage' && loyaltySettings.max_redemption_percentage
                            ? `${loyaltySettings.max_redemption_percentage}% of bill`
                            : 'No limit'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium">Program Scope</h4>
                  <p className="text-sm mt-1">
                    {loyaltySettings.apply_to_all 
                      ? 'Applied to all services and packages' 
                      : 'Applied to selected services and packages'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Points Redemption Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {isLoading ? (
              <Skeleton className="h-full w-full rounded-md" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={redemptionPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {redemptionPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(value) => [`${value} transactions`, '']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Loyalty Points Over Time</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          {isLoading ? (
            <Skeleton className="h-full w-full rounded-md" />
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 50,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="day"
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  tick={{ fontSize: 12 }}
                />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'discountAmount') {
                      return [formatCurrency(value as number), 'Discount Amount'];
                    }
                    return [value, name === 'pointsEarned' ? 'Points Earned' : 'Points Redeemed'];
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="pointsEarned" name="Points Earned" fill="#8884d8" />
                <Bar yAxisId="left" dataKey="pointsRedeemed" name="Points Redeemed" fill="#82ca9d" />
                <Bar yAxisId="right" dataKey="discountAmount" name="Discount Amount" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No loyalty data available for the selected time period
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Loyalty Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : loyaltyData && loyaltyData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Appointment ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Points Earned</TableHead>
                    <TableHead>Points Redeemed</TableHead>
                    <TableHead>Discount Amount</TableHead>
                    <TableHead>Order Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loyaltyData
                    .slice()
                    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
                    .slice(0, 10)
                    .map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono text-xs">
                          {transaction.id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          {transaction.start_time ? format(new Date(transaction.start_time), 'MMM dd, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {transaction.points_earned || 0}
                        </TableCell>
                        <TableCell>
                          {transaction.points_redeemed || 0}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(transaction.points_discount_amount || 0)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(transaction.total_price || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No loyalty transactions found in the selected date range.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
