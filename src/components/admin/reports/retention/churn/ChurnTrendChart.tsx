
import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface ChurnTrendChartProps {
  data: Array<{
    month: string;
    churnRate: number;
  }>;
}

export function ChurnTrendChart({ data }: ChurnTrendChartProps) {
  const chartConfig = {
    churnRate: {
      label: 'Churn Rate',
      color: '#f43f5e' // Rose color for churn
    }
  };

  // Set the domain for the y-axis based on the max churn rate
  const maxChurnRate = Math.max(...data.map(item => item.churnRate), 10);
  const yAxisDomain = [0, Math.ceil(maxChurnRate / 5) * 5]; // Round up to nearest 5

  return (
    <ChartContainer
      config={chartConfig}
      className="h-64"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 16, right: 16, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="churnGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
            tick={{ fontSize: 12 }}
            domain={yAxisDomain}
          />
          <Tooltip content={<ChartTooltipContent nameKey="month" labelKey="month" />} />
          <Area
            type="monotone"
            dataKey="churnRate"
            stroke="#f43f5e"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#churnGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
