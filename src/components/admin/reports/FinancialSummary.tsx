
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ArrowLeft, Download, Calendar as CalendarIcon, Filter, Star } from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FinancialSummaryProps {
  onBack?: () => void;
  expanded?: boolean;
  locations?: Array<{ id: string; name: string }>;
}

interface SalesData {
  month: string;
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  taxes: number;
  totalSales: number;
  giftCardSales: number;
  serviceCharges: number;
  tips: number;
  netOtherSales: number;
  taxOnOtherSales: number;
  totalOtherSales: number;
  totalSalesAndOtherSales: number;
  salesPaidInPeriod: number;
  unpaidSalesInPeriod: number;
}

interface PaymentsData {
  month: string;
  other: number;
  cash: number;
  totalPayments: number;
  paymentsForSalesInPeriod: number;
  paymentsForSalesInPreviousPeriods: number;
  upfrontPayments: number;
}

interface RedemptionsData {
  month: string;
  upfrontPaymentRedemption: number;
  giftCardRedemption: number;
  totalRedemptions: number;
  redemptionsForSalesInPeriod: number;
  redemptionsForSalesInPreviousPeriods: number;
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({ onBack, expanded, locations = [] }) => {
  const [timePeriod, setTimePeriod] = useState<string>('month');
  const [dateRange, setDateRange] = useState<{ from: Date, to: Date }>({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  // Generate months for the last 6 months including current month
  const generateMonths = () => {
    const months = [];
    for (let i = 0; i < 6; i++) {
      const date = subMonths(new Date(), i);
      months.unshift(format(date, 'MMM yyyy'));
    }
    return months;
  };

  const months = generateMonths();

  // Mock data for the sales table
  const salesData: SalesData[] = months.map((month) => ({
    month,
    grossSales: Math.floor(Math.random() * 2000) + 500,
    discounts: -(Math.floor(Math.random() * 50)),
    refunds: -(Math.floor(Math.random() * 300)),
    netSales: 0, // Calculated below
    taxes: 0,
    totalSales: 0, // Calculated below
    giftCardSales: 0,
    serviceCharges: 0,
    tips: 0,
    netOtherSales: 0,
    taxOnOtherSales: 0,
    totalOtherSales: 0,
    totalSalesAndOtherSales: 0, // Calculated below
    salesPaidInPeriod: 0, // Will match totalSales
    unpaidSalesInPeriod: 0
  }));

  // Calculate dependent values
  salesData.forEach(data => {
    data.netSales = data.grossSales + data.discounts + data.refunds;
    data.totalSales = data.netSales + data.taxes;
    data.totalSalesAndOtherSales = data.totalSales + data.totalOtherSales;
    data.salesPaidInPeriod = data.totalSales;
  });

  // Mock data for payments
  const paymentsData: PaymentsData[] = months.map((month, index) => {
    const salesData = salesData[index];
    const otherPayment = Math.floor(salesData.totalSales * 0.8);
    const cashPayment = salesData.totalSales - otherPayment;
    
    return {
      month,
      other: otherPayment,
      cash: cashPayment,
      totalPayments: salesData.totalSales,
      paymentsForSalesInPeriod: salesData.totalSales,
      paymentsForSalesInPreviousPeriods: 0,
      upfrontPayments: 0
    };
  });

  // Mock data for redemptions
  const redemptionsData: RedemptionsData[] = months.map(month => ({
    month,
    upfrontPaymentRedemption: 0,
    giftCardRedemption: 0,
    totalRedemptions: 0,
    redemptionsForSalesInPeriod: 0,
    redemptionsForSalesInPreviousPeriods: 0
  }));

  // Calculate totals
  const calculateTotals = (data: any[], key: string): number => {
    return data.reduce((sum, item) => sum + item[key], 0);
  };

  // Generate sales totals
  const salesTotals: Partial<SalesData> = {
    grossSales: calculateTotals(salesData, 'grossSales'),
    discounts: calculateTotals(salesData, 'discounts'),
    refunds: calculateTotals(salesData, 'refunds'),
    netSales: calculateTotals(salesData, 'netSales'),
    taxes: calculateTotals(salesData, 'taxes'),
    totalSales: calculateTotals(salesData, 'totalSales'),
    giftCardSales: calculateTotals(salesData, 'giftCardSales'),
    serviceCharges: calculateTotals(salesData, 'serviceCharges'),
    tips: calculateTotals(salesData, 'tips'),
    netOtherSales: calculateTotals(salesData, 'netOtherSales'),
    taxOnOtherSales: calculateTotals(salesData, 'taxOnOtherSales'),
    totalOtherSales: calculateTotals(salesData, 'totalOtherSales'),
    totalSalesAndOtherSales: calculateTotals(salesData, 'totalSalesAndOtherSales'),
    salesPaidInPeriod: calculateTotals(salesData, 'salesPaidInPeriod'),
    unpaidSalesInPeriod: calculateTotals(salesData, 'unpaidSalesInPeriod')
  };

  // Generate payments totals
  const paymentsTotals: Partial<PaymentsData> = {
    other: calculateTotals(paymentsData, 'other'),
    cash: calculateTotals(paymentsData, 'cash'),
    totalPayments: calculateTotals(paymentsData, 'totalPayments'),
    paymentsForSalesInPeriod: calculateTotals(paymentsData, 'paymentsForSalesInPeriod'),
    paymentsForSalesInPreviousPeriods: calculateTotals(paymentsData, 'paymentsForSalesInPreviousPeriods'),
    upfrontPayments: calculateTotals(paymentsData, 'upfrontPayments')
  };

  // Generate redemptions totals
  const redemptionsTotals: Partial<RedemptionsData> = {
    upfrontPaymentRedemption: calculateTotals(redemptionsData, 'upfrontPaymentRedemption'),
    giftCardRedemption: calculateTotals(redemptionsData, 'giftCardRedemption'),
    totalRedemptions: calculateTotals(redemptionsData, 'totalRedemptions'),
    redemptionsForSalesInPeriod: calculateTotals(redemptionsData, 'redemptionsForSalesInPeriod'),
    redemptionsForSalesInPreviousPeriods: calculateTotals(redemptionsData, 'redemptionsForSalesInPreviousPeriods')
  };

  // Format the currency amount
  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  // Return a CSS class based on the value (negative values get a different color)
  const getValueClass = (value: number) => {
    return value < 0 ? 'text-red-500' : '';
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <CardTitle className="text-2xl">Finance summary</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0" 
                  onClick={() => setIsFavorite(!isFavorite)}
                >
                  <Star className={cn("h-5 w-5", isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-400")} />
                </Button>
              </div>
              <CardDescription>High-level summary of sales, payments and liabilities</CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" /> Download
            </Button>
            <Button variant="outline">
              Options
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-6 bg-gray-50 p-4 rounded-md">
          <div className="flex items-center space-x-4">
            <Select value={timePeriod} onValueChange={setTimePeriod}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="quarter">Quarter</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[250px] justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{
                    from: dateRange.from,
                    to: dateRange.to,
                  }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <Button variant="outline" className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {locations.length > 0 && (
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="text-sm text-gray-500">
            Data from {format(new Date(), "MMM d")}
          </div>
        </div>

        {/* Sales Table */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Sales</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/4">Sales</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  {months.map((month) => (
                    <TableHead key={month} className="text-right">{month}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Gross sales</TableCell>
                  <TableCell className="text-right">{formatCurrency(salesTotals.grossSales || 0)}</TableCell>
                  {salesData.map((data, i) => (
                    <TableCell key={i} className="text-right">{formatCurrency(data.grossSales)}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8 text-indigo-500">Discounts</TableCell>
                  <TableCell className={`text-right ${getValueClass(salesTotals.discounts || 0)}`}>
                    {formatCurrency(salesTotals.discounts || 0)}
                  </TableCell>
                  {salesData.map((data, i) => (
                    <TableCell key={i} className={`text-right ${getValueClass(data.discounts)}`}>
                      {formatCurrency(data.discounts)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8">Refunds / Returns</TableCell>
                  <TableCell className={`text-right ${getValueClass(salesTotals.refunds || 0)}`}>
                    {formatCurrency(salesTotals.refunds || 0)}
                  </TableCell>
                  {salesData.map((data, i) => (
                    <TableCell key={i} className={`text-right ${getValueClass(data.refunds)}`}>
                      {formatCurrency(data.refunds)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Net sales</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(salesTotals.netSales || 0)}
                  </TableCell>
                  {salesData.map((data, i) => (
                    <TableCell key={i} className="text-right font-medium">
                      {formatCurrency(data.netSales)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8 text-indigo-500">Taxes</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(salesTotals.taxes || 0)}
                  </TableCell>
                  {salesData.map((data, i) => (
                    <TableCell key={i} className="text-right">
                      {formatCurrency(data.taxes)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="bg-gray-50">
                  <TableCell className="text-indigo-600 font-medium">Total sales</TableCell>
                  <TableCell className="text-right font-medium text-indigo-600">
                    {formatCurrency(salesTotals.totalSales || 0)}
                  </TableCell>
                  {salesData.map((data, i) => (
                    <TableCell key={i} className="text-right font-medium text-indigo-600">
                      {formatCurrency(data.totalSales)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8 text-indigo-500">Gift card sales</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(salesTotals.giftCardSales || 0)}
                  </TableCell>
                  {salesData.map((data, i) => (
                    <TableCell key={i} className="text-right">
                      {formatCurrency(data.giftCardSales)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8 text-indigo-500">Service charges</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(salesTotals.serviceCharges || 0)}
                  </TableCell>
                  {salesData.map((data, i) => (
                    <TableCell key={i} className="text-right">
                      {formatCurrency(data.serviceCharges)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8 text-indigo-500">Tips</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(salesTotals.tips || 0)}
                  </TableCell>
                  {salesData.map((data, i) => (
                    <TableCell key={i} className="text-right">
                      {formatCurrency(data.tips)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium pl-4">Net other sales</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(salesTotals.netOtherSales || 0)}
                  </TableCell>
                  {salesData.map((data, i) => (
                    <TableCell key={i} className="text-right font-medium">
                      {formatCurrency(data.netOtherSales)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8">Tax on other sales</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(salesTotals.taxOnOtherSales || 0)}
                  </TableCell>
                  {salesData.map((data, i) => (
                    <TableCell key={i} className="text-right">
                      {formatCurrency(data.taxOnOtherSales)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="bg-gray-50">
                  <TableCell className="font-medium">Total other sales</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(salesTotals.totalOtherSales || 0)}
                  </TableCell>
                  {salesData.map((data, i) => (
                    <TableCell key={i} className="text-right font-medium">
                      {formatCurrency(data.totalOtherSales)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="bg-gray-50">
                  <TableCell className="font-medium">Total sales + other sales</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(salesTotals.totalSalesAndOtherSales || 0)}
                  </TableCell>
                  {salesData.map((data, i) => (
                    <TableCell key={i} className="text-right font-medium">
                      {formatCurrency(data.totalSalesAndOtherSales)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8">Sales paid in period</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(salesTotals.salesPaidInPeriod || 0)}
                  </TableCell>
                  {salesData.map((data, i) => (
                    <TableCell key={i} className="text-right">
                      {formatCurrency(data.salesPaidInPeriod)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8">Unpaid sales in period</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(salesTotals.unpaidSalesInPeriod || 0)}
                  </TableCell>
                  {salesData.map((data, i) => (
                    <TableCell key={i} className="text-right">
                      {formatCurrency(data.unpaidSalesInPeriod)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Payments Table */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Payments</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/4"></TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  {months.map((month) => (
                    <TableHead key={month} className="text-right">{month}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="pl-8">Other</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(paymentsTotals.other || 0)}
                  </TableCell>
                  {paymentsData.map((data, i) => (
                    <TableCell key={i} className="text-right">
                      {formatCurrency(data.other)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8">Cash</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(paymentsTotals.cash || 0)}
                  </TableCell>
                  {paymentsData.map((data, i) => (
                    <TableCell key={i} className="text-right">
                      {formatCurrency(data.cash)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="bg-gray-50">
                  <TableCell className="text-indigo-600 font-medium">Total payments</TableCell>
                  <TableCell className="text-right font-medium text-indigo-600">
                    {formatCurrency(paymentsTotals.totalPayments || 0)}
                  </TableCell>
                  {paymentsData.map((data, i) => (
                    <TableCell key={i} className="text-right font-medium text-indigo-600">
                      {formatCurrency(data.totalPayments)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8">Payments for sales in period</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(paymentsTotals.paymentsForSalesInPeriod || 0)}
                  </TableCell>
                  {paymentsData.map((data, i) => (
                    <TableCell key={i} className="text-right">
                      {formatCurrency(data.paymentsForSalesInPeriod)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8">Payments for sales in previous periods</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(paymentsTotals.paymentsForSalesInPreviousPeriods || 0)}
                  </TableCell>
                  {paymentsData.map((data, i) => (
                    <TableCell key={i} className="text-right">
                      {formatCurrency(data.paymentsForSalesInPreviousPeriods)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8 text-indigo-500">Upfront payments</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(paymentsTotals.upfrontPayments || 0)}
                  </TableCell>
                  {paymentsData.map((data, i) => (
                    <TableCell key={i} className="text-right">
                      {formatCurrency(data.upfrontPayments)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Redemptions Table */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Redemptions</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/4"></TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  {months.map((month) => (
                    <TableHead key={month} className="text-right">{month}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="pl-8 text-indigo-500">Upfront payment redemption</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(redemptionsTotals.upfrontPaymentRedemption || 0)}
                  </TableCell>
                  {redemptionsData.map((data, i) => (
                    <TableCell key={i} className="text-right">
                      {formatCurrency(data.upfrontPaymentRedemption)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8 text-indigo-500">Gift card redemption</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(redemptionsTotals.giftCardRedemption || 0)}
                  </TableCell>
                  {redemptionsData.map((data, i) => (
                    <TableCell key={i} className="text-right">
                      {formatCurrency(data.giftCardRedemption)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="bg-gray-50">
                  <TableCell className="text-indigo-600 font-medium">Total redemptions</TableCell>
                  <TableCell className="text-right font-medium text-indigo-600">
                    {formatCurrency(redemptionsTotals.totalRedemptions || 0)}
                  </TableCell>
                  {redemptionsData.map((data, i) => (
                    <TableCell key={i} className="text-right font-medium text-indigo-600">
                      {formatCurrency(data.totalRedemptions)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8">Redemptions for sales in period</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(redemptionsTotals.redemptionsForSalesInPeriod || 0)}
                  </TableCell>
                  {redemptionsData.map((data, i) => (
                    <TableCell key={i} className="text-right">
                      {formatCurrency(data.redemptionsForSalesInPeriod)}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="pl-8">Redemptions for sales in previous periods</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(redemptionsTotals.redemptionsForSalesInPreviousPeriods || 0)}
                  </TableCell>
                  {redemptionsData.map((data, i) => (
                    <TableCell key={i} className="text-right">
                      {formatCurrency(data.redemptionsForSalesInPreviousPeriods)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialSummary;
