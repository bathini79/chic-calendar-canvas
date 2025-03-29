
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { LocationSelector } from './LocationSelector';

export const TopServices = ({ locations, topServicesLocationId, setTopServicesLocationId }) => {
  const [topServices, setTopServices] = useState([]);

  const fetchTopServices = useCallback(async () => {
    try {
      const today = new Date();
      const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

      const { data: servicesData, error: servicesError } = await supabase.from("services").select("id, name");
      if (servicesError) throw servicesError;

      let thisMonthQuery = supabase.from("bookings").select("service_id, created_at, appointment_id")
        .gte("created_at", firstDayThisMonth.toISOString()).lte("created_at", lastDayThisMonth.toISOString()).not("service_id", "is", null);
      let lastMonthQuery = supabase.from("bookings").select("service_id, created_at, appointment_id")
        .gte("created_at", firstDayLastMonth.toISOString()).lte("created_at", lastDayLastMonth.toISOString()).not("service_id", "is", null);

      if (topServicesLocationId !== "all") {
        const { data: thisMonthAppointments } = await supabase.from("appointments").select("id").eq("location", topServicesLocationId)
          .gte("created_at", firstDayThisMonth.toISOString()).lte("created_at", lastDayThisMonth.toISOString());
        const { data: lastMonthAppointments } = await supabase.from("appointments").select("id").eq("location", topServicesLocationId)
          .gte("created_at", firstDayLastMonth.toISOString()).lte("created_at", lastDayLastMonth.toISOString());

        const thisMonthAppIds = thisMonthAppointments.map(app => app.id);
        const lastMonthAppIds = lastMonthAppointments.map(app => app.id);
        thisMonthQuery = thisMonthAppIds.length > 0 ? thisMonthQuery.in("appointment_id", thisMonthAppIds) : thisMonthQuery.eq("appointment_id", "no-results");
        lastMonthQuery = lastMonthAppIds.length > 0 ? lastMonthQuery.in("appointment_id", lastMonthAppIds) : lastMonthQuery.eq("appointment_id", "no-results");
      }

      const [thisMonthResult, lastMonthResult] = await Promise.all([thisMonthQuery, lastMonthQuery]);
      if (thisMonthResult.error || lastMonthResult.error) throw thisMonthResult.error || lastMonthResult.error;

      const serviceMap = {};
      servicesData.forEach(service => serviceMap[service.id] = service.name);

      const thisMonthCounts = {};
      thisMonthResult.data.forEach(booking => {
        if (booking.service_id && serviceMap[booking.service_id]) thisMonthCounts[serviceMap[booking.service_id]] = (thisMonthCounts[serviceMap[booking.service_id]] || 0) + 1;
      });

      const lastMonthCounts = {};
      lastMonthResult.data.forEach(booking => {
        if (booking.service_id && serviceMap[booking.service_id]) lastMonthCounts[serviceMap[booking.service_id]] = (lastMonthCounts[serviceMap[booking.service_id]] || 0) + 1;
      });

      const servicesArray = Object.keys(thisMonthCounts).map(name => ({ name, thisMonth: thisMonthCounts[name], lastMonth: lastMonthCounts[name] || 0 }));
      servicesArray.sort((a, b) => b.thisMonth - a.thisMonth);
      setTopServices(servicesArray.slice(0, 5));
    } catch (error) {
      console.error("Error fetching top services:", error);
      setTopServices([]);
    }
  }, [topServicesLocationId]);

  useEffect(() => { fetchTopServices(); }, [fetchTopServices]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg">Top Services</CardTitle>
        <LocationSelector 
          value={topServicesLocationId} 
          onChange={setTopServicesLocationId} 
          locations={locations} 
          className="w-[150px]"
        />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left font-medium text-gray-500 pb-3">Service</th>
                <th className="text-right font-medium text-gray-500 pb-3">This month</th>
                <th className="text-right font-medium text-gray-500 pb-3">Last month</th>
              </tr>
            </thead>
            <tbody>
              {topServices.length > 0 ? topServices.map((service, index) => (
                <tr key={index} className="border-t">
                  <td className="py-3">{service.name}</td>
                  <td className="py-3 text-right">{service.thisMonth}</td>
                  <td className="py-3 text-right">{service.lastMonth}</td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="py-8 text-center text-muted-foreground">No service data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
