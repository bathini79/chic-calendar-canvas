
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { LocationSelector } from './LocationSelector';

interface StylistPerformance {
  id: string;
  name: string;
  photoUrl: string | null;
  bookings: number;
  revenue: number;
}

export const TopTeamMembers = ({ locations, topStylistsLocationId, setTopStylistsLocationId }) => {
  const [topStylists, setTopStylists] = useState<StylistPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTopStylists = useCallback(async () => {
    try {
      const today = new Date();
      const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // First get all stylists
      let stylistsQuery = supabase
        .from("employees")
        .select("id, name, photo_url")
        .eq("employment_type", "stylist")
        .eq("status", "active");

      if (topStylistsLocationId !== "all") {
        const { data: employeeLocations } = await supabase
          .from("employee_locations")
          .select("employee_id")
          .eq("location_id", topStylistsLocationId);
        
        if (employeeLocations && employeeLocations.length > 0) {
          const employeeIds = employeeLocations.map(el => el.employee_id);
          stylistsQuery = stylistsQuery.in("id", employeeIds);
        }
      }

      const { data: stylists, error: stylistsError } = await stylistsQuery;
      if (stylistsError) throw stylistsError;

      // Then get all bookings for this month
      let bookingsQuery = supabase
        .from("bookings")
        .select("employee_id, price_paid, appointment_id")
        .not("employee_id", "is", null);

      if (topStylistsLocationId !== "all") {
        const { data: appointments } = await supabase
          .from("appointments")
          .select("id")
          .eq("location", topStylistsLocationId)
          .gte("created_at", firstDayThisMonth.toISOString())
          .lte("created_at", lastDayThisMonth.toISOString());
        
        if (appointments && appointments.length > 0) {
          const appointmentIds = appointments.map(a => a.id);
          bookingsQuery = bookingsQuery.in("appointment_id", appointmentIds);
        } else {
          // No appointments for this location
          bookingsQuery = bookingsQuery.eq("appointment_id", "no-results");
        }
      } else {
        bookingsQuery = bookingsQuery
          .gte("created_at", firstDayThisMonth.toISOString())
          .lte("created_at", lastDayThisMonth.toISOString());
      }

      const { data: bookings, error: bookingsError } = await bookingsQuery;
      if (bookingsError) throw bookingsError;

      // Calculate bookings and revenue by stylist
      const stylistPerformance: Record<string, StylistPerformance> = {};
      stylists?.forEach(stylist => {
        stylistPerformance[stylist.id] = {
          id: stylist.id,
          name: stylist.name,
          photoUrl: stylist.photo_url,
          bookings: 0,
          revenue: 0
        };
      });

      bookings?.forEach(booking => {
        if (booking.employee_id && stylistPerformance[booking.employee_id]) {
          stylistPerformance[booking.employee_id].bookings += 1;
          stylistPerformance[booking.employee_id].revenue += booking.price_paid || 0;
        }
      });

      // Sort by revenue and take top 5
      const sortedStylists = Object.values(stylistPerformance)
        .sort((a, b) => (b.revenue as number) - (a.revenue as number))
        .slice(0, 5);

      setTopStylists(sortedStylists);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching top stylists:", error);
      setTopStylists([]);
      setIsLoading(false);
    }
  }, [topStylistsLocationId]);

  useEffect(() => {
    setIsLoading(true);
    fetchTopStylists();
  }, [fetchTopStylists]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Top Team Members</CardTitle>
        <LocationSelector 
          value={topStylistsLocationId} 
          onChange={setTopStylistsLocationId} 
          locations={locations} 
          className="w-[140px]"
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <p>Loading stylists...</p>
          </div>
        ) : topStylists.length > 0 ? (
          <div className="space-y-4">
            {topStylists.map(stylist => (
              <div key={stylist.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={stylist.photoUrl || undefined} alt={stylist.name} />
                    <AvatarFallback>{stylist.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{stylist.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {stylist.bookings} booking{stylist.bookings !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="text-right font-medium">₹{stylist.revenue.toFixed(2)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No stylist data available
          </div>
        )}
      </CardContent>
    </Card>
  );
};
