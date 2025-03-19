import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { formatPrice } from '@/lib/utils';

interface FinancialSummaryProps {
  locationId?: string;
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({ locationId }) => {
  // Fix the variable declaration order issue - ensure salesData is declared before it's used
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

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Financial Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <Tooltip formatter={(value) => [formatPrice(value), "Revenue"]} />
            <Area type="monotone" dataKey="amount" stroke="#8884d8" fill="#8884d8" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default FinancialSummary;
