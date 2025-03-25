
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface RetentionTrendChartProps {
  data: Array<{
    period: string;
    retentionRate: number;
  }>;
}

export function RetentionTrendChart({ data }: RetentionTrendChartProps) {
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
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="period" 
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
          <ReferenceLine y={70} stroke="#888" strokeDasharray="3 3" label={{ value: 'Industry Avg (70%)', position: 'right', fill: '#888', fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="retentionRate"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ stroke: '#10b981', strokeWidth: 2, r: 4, fill: '#fff' }}
            activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
