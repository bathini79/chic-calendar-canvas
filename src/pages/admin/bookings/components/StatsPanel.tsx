
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MoreHorizontal } from 'lucide-react';

interface Stat {
  label: string;
  value: number;
}

interface ChartData {
  day: string;
  confirmed: number;
  booked: number;
  cancelled: number;
}

interface StatsPanelProps {
  stats: Stat[];
  chartData?: ChartData[];
  totalBooked?: number;
  confirmedCount?: number;
  bookedCount?: number;
  cancelledCount?: number;
}

export function StatsPanel({ 
  stats, 
  chartData = [], 
  totalBooked = 0, 
  confirmedCount = 0,
  bookedCount = 0,
  cancelledCount = 0 
}: StatsPanelProps) {
  return (
    <div className="space-y-4 overflow-hidden">
      {chartData.length > 0 ? (
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Upcoming appointments</CardTitle>
              <CardDescription>Next 7 days</CardDescription>
            </div>
            <MoreHorizontal className="h-5 w-5 text-gray-400" />
          </CardHeader>
          <CardContent className="overflow-y-auto max-h-[550px]">
            {chartData.length > 0 ? (
              <>
                <div className="mb-4">
                  <h2 className="text-2xl sm:text-3xl font-bold">{totalBooked} booked</h2>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs sm:text-sm text-gray-500">Confirmed appointments <span className="font-semibold">{confirmedCount}</span></p>
                    <p className="text-xs sm:text-sm text-gray-500">Booked appointments <span className="font-semibold">{bookedCount}</span></p>
                    <p className="text-xs sm:text-sm text-gray-500">Cancelled appointments <span className="font-semibold">{cancelledCount}</span></p>
                  </div>
                </div>
                
                <div className="h-[250px] sm:h-[300px] overflow-x-auto overflow-y-auto">
                  <div className="min-w-[500px] h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" angle={-45} textAnchor="end" />
                        <YAxis />
                        <Tooltip />
                        <Legend 
                          verticalAlign="bottom" 
                          align="left"
                          wrapperStyle={{ bottom: 0, left: 10 }}
                        />
                        <Bar dataKey="confirmed" name="Confirmed" fill="#8884d8" />
                        <Bar dataKey="booked" name="Booked" fill="#82ca9d" />
                        <Bar dataKey="cancelled" name="Cancelled" fill="#FF5353" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-xl font-semibold">Your schedule is empty</h3>
                <p className="text-gray-500 mt-2">Make some appointments for schedule data to appear</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
