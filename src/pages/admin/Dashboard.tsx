
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { TopTeamMembers } from '@/components/admin/dashboard/TopTeamMembers';
import { TodaysAppointments } from '@/components/admin/dashboard/TodaysAppointments';
import { TopServices } from '@/components/admin/dashboard/TopServices';
import { InventoryStatus } from '@/components/admin/dashboard/InventoryStatus';
import { UpcomingAppointments } from '@/components/admin/dashboard/UpcomingAppointments';
import { RecentSales } from '@/components/admin/dashboard/RecentSales';

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState("today");
  const [locations, setLocations] = useState([]);
  const [recentSalesLocationId, setRecentSalesLocationId] = useState("all");
  const [todayAppointmentsLocationId, setTodayAppointmentsLocationId] = useState("all");
  const [upcomingAppointmentsLocationId, setUpcomingAppointmentsLocationId] = useState("all");
  const [inventoryLocationId, setInventoryLocationId] = useState("all");
  const [topServicesLocationId, setTopServicesLocationId] = useState("all");
  const [topStylistsLocationId, setTopStylistsLocationId] = useState("all");
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetchLocations();
    fetchEmployees();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase.from("locations").select("id, name").eq("status", "active");
      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase.from("employees").select("*").eq("employment_type", "stylist");
      if (error) throw error;
      const employeeWithAvatar = data.map(employee => ({
        ...employee,
        avatar: employee.name.split(" ").map(n => n[0]).join(""),
      }));
      setEmployees(employeeWithAvatar);
    } catch (error) {
      console.error("Error fetching employees:", error);
      setEmployees([]);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 overflow-hidden">
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Dashboard</h1>
      
      {/* First Row */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full">
        <div className="w-full md:w-1/2 overflow-x-auto">
          <RecentSales
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            locations={locations}
            recentSalesLocationId={recentSalesLocationId}
            setRecentSalesLocationId={setRecentSalesLocationId}
          />
        </div>
        <div className="w-full md:w-1/2 overflow-x-auto">
          <TodaysAppointments
            locations={locations}
            todayAppointmentsLocationId={todayAppointmentsLocationId}
            setTodayAppointmentsLocationId={setTodayAppointmentsLocationId}
            onAppointmentClick={() => {}}
            employees={employees}
          />
        </div>
      </div>
      
      {/* Second Row */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full">
        <div className="w-full md:w-1/2 overflow-x-auto">
          <UpcomingAppointments
            locations={locations}
            upcomingAppointmentsLocationId={upcomingAppointmentsLocationId}
            setUpcomingAppointmentsLocationId={setUpcomingAppointmentsLocationId}
          />
        </div>
        <div className="w-full md:w-1/2 overflow-x-auto">
          <InventoryStatus
            locations={locations}
            inventoryLocationId={inventoryLocationId}
            setInventoryLocationId={setInventoryLocationId}
          />
        </div>
      </div>
      
      {/* Third Row */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full">
        <div className="w-full md:w-1/2 overflow-x-auto">
          <TopServices
            locations={locations}
            topServicesLocationId={topServicesLocationId}
            setTopServicesLocationId={setTopServicesLocationId}
          />
        </div>
        <div className="w-full md:w-1/2 overflow-x-auto">
          <TopTeamMembers
            locations={locations}
            topStylistsLocationId={topStylistsLocationId}
            setTopStylistsLocationId={setTopStylistsLocationId}
          />
        </div>
      </div>
    </div>
  );
}
