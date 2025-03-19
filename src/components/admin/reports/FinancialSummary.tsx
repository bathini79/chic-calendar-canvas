
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, TooltipProps } from 'recharts';
import { formatPrice } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FinancialSummaryProps {
  locationId?: string;
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({ locationId }) => {
  const [timeRange, setTimeRange] = useState('6months');
  
  // Define sales data
  const salesData = [
    { month: "January", amount: 45000 },
    { month: "February", amount: 52000 },
    { month: "March", amount: 48000 },
    { month: "April", amount: 61000 },
    { month: "May", amount: 55000 },
    { month: "June", amount: 67000 },
  ];

  const totalRevenue = salesData.reduce((sum, data) => sum + data.amount, 0);
  const averageRevenue = totalRevenue / salesData.length;

  // Custom tooltip formatter that handles type checking
  const formatTooltipValue = (value: any, name: string) => {
    if (typeof value === 'number') {
      return [formatPrice(value), name];
    }
    return [value, name];
  };

  const handleExport = () => {
    // Implement CSV export functionality
    const headers = ['Month', 'Revenue'];
    const csvContent = [
      headers.join(','),
      ...salesData.map(item => [item.month, item.amount].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'financial_summary.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Financial Summary</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleExport}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold">Total Revenue</h3>
            <p className="text-2xl">{formatPrice(totalRevenue)}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Average Monthly Revenue</h3>
            <p className="text-2xl">{formatPrice(averageRevenue)}</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value) => formatPrice(value)} />
            <Tooltip formatter={formatTooltipValue} />
            <Area type="monotone" dataKey="amount" name="Revenue" stroke="#8884d8" fill="#8884d8" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default FinancialSummary;
