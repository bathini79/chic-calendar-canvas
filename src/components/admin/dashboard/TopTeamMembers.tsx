
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { LocationSelector } from './LocationSelector';
import { formatPrice } from "@/lib/utils";

export const TopTeamMembers = ({ locations, topStylistsLocationId, setTopStylistsLocationId }) => {
  const [topStylists, setTopStylists] = useState([]);

  const fetchTopStylists = useCallback(async () => {
    try {
      const today = new Date();
      const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

      const { data: employeesData, error: employeesError } = await supabase.from("employees").select("id, name").eq("employment_type", "stylist");
      if (employeesError) throw employeesError;

      let thisMonthQuery = supabase.from("bookings").select("employee_id, price_paid, created_at, appointment_id")
        .gte("created_at", firstDayThisMonth.toISOString()).lte("created_at", lastDayThisMonth.toISOString()).not("employee_id", "is", null);
      let lastMonthQuery = supabase.from("bookings").select("employee_id, price_paid, created_at, appointment_id")
        .gte("created_at", firstDayLastMonth.toISOString()).lte("created_at", lastDayLastMonth.toISOString()).not("employee_id", "is", null);

      if (topStylistsLocationId !== "all") {
        const { data: thisMonthAppointments } = await supabase.from("appointments").select("id").eq("location", topStylistsLocationId)
          .gte("created_at", firstDayThisMonth.toISOString()).lte("created_at", lastDayThisMonth.toISOString());
        const { data: lastMonthAppointments } = await supabase.from("appointments").select("id").eq("location", topStylistsLocationId)
          .gte("created_at", firstDayLastMonth.toISOString()).lte("created_at", lastDayLastMonth.toISOString());

        const thisMonthAppIds = thisMonthAppointments.map(app => app.id);
        const lastMonthAppIds = lastMonthAppointments.map(app => app.id);
        thisMonthQuery = thisMonthAppIds.length > 0 ? thisMonthQuery.in("appointment_id", thisMonthAppIds) : thisMonthQuery.eq("appointment_id", "no-results");
        lastMonthQuery = lastMonthAppIds.length > 0 ? lastMonthQuery.in("appointment_id", lastMonthAppIds) : lastMonthQuery.eq("appointment_id", "no-results");
      }

      const [thisMonthResult, lastMonthResult] = await Promise.all([thisMonthQuery, lastMonthQuery]);
      if (thisMonthResult.error || lastMonthResult.error) throw thisMonthResult.error || lastMonthResult.error;

      const employeeMap = {};
      employeesData.forEach(employee => employeeMap[employee.id] = employee.name);

      const thisMonthRevenue = {};
      thisMonthResult.data.forEach(booking => {
        if (booking.employee_id && employeeMap[booking.employee_id]) thisMonthRevenue[employeeMap[booking.employee_id]] = (thisMonthRevenue[employeeMap[booking.employee_id]] || 0) + (booking.price_paid || 0);
      });

      const lastMonthRevenue = {};
      lastMonthResult.data.forEach(booking => {
        if (booking.employee_id && employeeMap[booking.employee_id]) lastMonthRevenue[employeeMap[booking.employee_id]] = (lastMonthRevenue[employeeMap[booking.employee_id]] || 0) + (booking.price_paid || 0);
      });

      const stylistsArray = Object.keys(thisMonthRevenue).map(name => ({ name, thisMonth: thisMonthRevenue[name], lastMonth: lastMonthRevenue[name] || 0 }));
      stylistsArray.sort((a, b) => b.thisMonth - a.thisMonth);
      setTopStylists(stylistsArray.slice(0, 5));
    } catch (error) {
      console.error("Error fetching top stylists:", error);
      setTopStylists([]);
    }
  }, [topStylistsLocationId]);

  useEffect(() => { fetchTopStylists(); }, [fetchTopStylists]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg">Top Team Members</CardTitle>
        <LocationSelector 
          value={topStylistsLocationId} 
          onChange={setTopStylistsLocationId} 
          locations={locations} 
          className="w-[150px]"
        />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left font-medium text-gray-500 pb-3">Team Member</th>
                <th className="text-right font-medium text-gray-500 pb-3">This month</th>
                <th className="text-right font-medium text-gray-500 pb-3">Last month</th>
              </tr>
            </thead>
            <tbody>
              {topStylists.length > 0 ? topStylists.map((stylist, index) => (
                <tr key={index} className="border-t">
                  <td className="py-3">{stylist.name}</td>
                  <td className="py-3 text-right">{formatPrice(stylist.thisMonth)}</td>
                  <td className="py-3 text-right">{formatPrice(stylist.lastMonth)}</td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="py-8 text-center text-muted-foreground">No team member data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
