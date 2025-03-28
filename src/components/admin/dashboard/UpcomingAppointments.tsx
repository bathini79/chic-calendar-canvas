
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { addDays, format, parseISO } from "date-fns";
import { LocationSelector } from './LocationSelector';
import { StatsPanel } from '@/pages/admin/bookings/components/StatsPanel';

export const UpcomingAppointments = ({ locations, upcomingAppointmentsLocationId, setUpcomingAppointmentsLocationId }) => {
  const [upcomingAppointmentsChart, setUpcomingAppointmentsChart] = useState([]);
  const [upcomingStats, setUpcomingStats] = useState({ total: 0, confirmed: 0, booked: 0, cancelled: 0 });

  const fetchUpcomingAppointments = useCallback(async () => {
    try {
      const tomorrow = addDays(new Date(), 1);
      tomorrow.setHours(0, 0, 0, 0);
      const nextWeek = addDays(tomorrow, 7);
      nextWeek.setHours(23, 59, 59, 999);

      let query = supabase
        .from("appointments")
        .select("id, start_time, end_time, status")
        .gte("start_time", tomorrow.toISOString())
        .lt("start_time", nextWeek.toISOString())
        .order("start_time", { ascending: true });
      if (upcomingAppointmentsLocationId !== "all") query = query.eq("location", upcomingAppointmentsLocationId);

      const { data, error } = await query;
      if (error) throw error;

      const chartData = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const statusCounts = { total: 0, confirmed: 0, booked: 0, cancelled: 0 };

      for (let i = 0; i < 7; i++) {
        const currentDate = addDays(tomorrow, i);
        chartData.push({ day: `${dayNames[currentDate.getDay()]} ${currentDate.getDate()}`, confirmed: 0, booked: 0, cancelled: 0, date: currentDate });
      }

      data?.forEach(appointment => {
        const appointmentDate = parseISO(appointment.start_time);
        const dayIndex = Math.floor((appointmentDate.getTime() - tomorrow.getTime()) / (1000 * 60 * 60 * 24));
        if (dayIndex >= 0 && dayIndex < 7) {
          statusCounts.total++;
          if (appointment.status === 'confirmed') statusCounts.confirmed++, chartData[dayIndex].confirmed++;
          else if (appointment.status === 'canceled') statusCounts.cancelled++, chartData[dayIndex].cancelled++;
          else if (appointment.status === 'booked') statusCounts.booked++, chartData[dayIndex].booked++;
        }
      });

      setUpcomingAppointmentsChart(chartData);
      setUpcomingStats(statusCounts);
    } catch (error) {
      console.error("Error fetching upcoming appointments:", error);
      setUpcomingAppointmentsChart([]);
      setUpcomingStats({ total: 0, confirmed: 0, booked: 0, cancelled: 0 });
    }
  }, [upcomingAppointmentsLocationId]);

  useEffect(() => { fetchUpcomingAppointments(); }, [fetchUpcomingAppointments]);

  return (
    <Card className="shadow-sm h-full overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 space-y-2 sm:space-y-0">
        <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
        <div className="w-full sm:w-auto">
          <LocationSelector 
            value={upcomingAppointmentsLocationId} 
            onChange={setUpcomingAppointmentsLocationId} 
            locations={locations} 
            className="w-full"
          />
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto overflow-y-auto max-h-[400px]">
        {upcomingAppointmentsChart.length > 0 ? (
          <StatsPanel
            stats={[]} 
            chartData={upcomingAppointmentsChart}
            totalBooked={upcomingStats.total}
            confirmedCount={upcomingStats.confirmed}
            bookedCount={upcomingStats.booked}
            cancelledCount={upcomingStats.cancelled}
          />
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold">Your schedule is empty</h3>
            <p className="text-gray-500 mt-2 text-center">Make some appointments for schedule data to appear</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
