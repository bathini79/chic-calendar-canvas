
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ServiceRevenueChartProps {
  data?: { name: string; revenue: number }[];
  selectedDate?: Date;
  locationId?: string;
}

const ServiceRevenueChart: React.FC<ServiceRevenueChartProps> = ({ data = [], selectedDate, locationId }) => {
  // Custom tooltip to display revenue
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border rounded shadow p-2">
          <p className="font-semibold">{`${label}`}</p>
          <p className="text-gray-700">{`Revenue: ₹${Number(payload[0].value).toFixed(2)}`}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="revenue" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ServiceRevenueChart;
