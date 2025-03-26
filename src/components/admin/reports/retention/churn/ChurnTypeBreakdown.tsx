
import React from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface ChurnTypeBreakdownProps {
  data?: {
    customerChurn: number;
    revenueChurn: number;
    frequencyChurn: number;
    subscriptionChurn: number;
  };
  fullSize?: boolean;
}

export function ChurnTypeBreakdown({ data, fullSize = false }: ChurnTypeBreakdownProps) {
  if (!data) return null;
  
  const chartData = [
    {
      name: 'Customer Churn',
      value: data.customerChurn,
      color: '#f43f5e' // Rose
    },
    {
      name: 'Revenue Churn',
      value: data.revenueChurn,
      color: '#ec4899' // Pink
    },
    {
      name: 'Frequency Churn',
      value: data.frequencyChurn,
      color: '#8b5cf6' // Violet
    },
    {
      name: 'Subscription Churn',
      value: data.subscriptionChurn,
      color: '#3b82f6' // Blue
    }
  ];
  
  const chartConfig = chartData.reduce((acc, item) => {
    acc[item.name] = {
      label: item.name,
      color: item.color
    };
    return acc;
  }, {} as Record<string, { label: string, color: string }>);

  return (
    <ChartContainer
      config={chartConfig}
      className={fullSize ? "h-full" : "h-40"}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={fullSize ? 70 : 40}
            outerRadius={fullSize ? 120 : 70}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={fullSize ? 
              ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%` : 
              false
            }
            labelLine={fullSize}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltipContent />} />
          {!fullSize && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
