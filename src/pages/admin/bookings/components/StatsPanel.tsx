
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Stat {
  label: string;
  value: number;
}

interface ChartData {
  day: string;
  confirmed: number;
  cancelled: number;
}

interface StatsPanelProps {
  stats: Stat[];
  chartData?: ChartData[];
  totalBooked?: number;
  confirmedCount?: number;
  cancelledCount?: number;
}

export function StatsPanel({ 
  stats, 
  chartData = [], 
  totalBooked = 0, 
  confirmedCount = 0,
  cancelledCount = 0 
}: StatsPanelProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 border-b bg-white flex space-x-4 overflow-x-auto">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white border rounded shadow-sm px-4 py-2 min-w-[150px]"
          >
            <div className="text-gray-500 text-sm">{stat.label}</div>
            <div className="text-xl font-bold">
              {stat.label === "Today's Revenue"
                ? `₹${stat.value}`
                : stat.value}
            </div>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming appointments</CardTitle>
            <CardDescription>Next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <h2 className="text-3xl font-bold">{totalBooked} booked</h2>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-500">Confirmed appointments <span className="font-semibold">{confirmedCount}</span></p>
                <p className="text-sm text-gray-500">Cancelled appointments <span className="font-semibold">{cancelledCount}</span></p>
              </div>
            </div>
            
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" angle={-45} textAnchor="end" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="confirmed" name="Confirmed" fill="#8884d8" />
                  <Bar dataKey="cancelled" name="Cancelled" fill="#FF5353" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
