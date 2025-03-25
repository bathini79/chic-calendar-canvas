
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface RetentionComparisonProps {
  companyRate: number;
  industryRate: number;
}

export function RetentionComparison({
  companyRate,
  industryRate
}: RetentionComparisonProps) {
  const data = [
    {
      name: 'Your Business',
      rate: companyRate
    },
    {
      name: 'Industry Avg',
      rate: industryRate
    }
  ];
  
  const getBarColor = (rate: number) => {
    if (rate >= 80) return '#10b981'; // Green for excellent
    if (rate >= 60) return '#f59e0b'; // Amber for good
    return '#ef4444'; // Red for poor
  };
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md shadow-sm p-2 text-xs">
          <p className="font-medium">{label}</p>
          <p className="text-primary">Retention Rate: {payload[0].value}%</p>
        </div>
      );
    }
  
    return null;
  };

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
            axisLine={{ stroke: '#e0e0e0' }}
            tickLine={{ stroke: '#e0e0e0' }}
          />
          <YAxis 
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
            axisLine={{ stroke: '#e0e0e0' }}
            tickLine={{ stroke: '#e0e0e0' }}
            label={{ value: 'Retention Rate (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 12, fill: '#888' } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="rate" barSize={60}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.rate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
