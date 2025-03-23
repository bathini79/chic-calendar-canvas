
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { AppointmentDetailsDialog } from "./bookings/components/AppointmentDetailsDialog";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
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
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState(null);
  const [appointmentTime, setAppointmentTime] = useState("");
  const [employees, setEmployees] = useState([]);
  const navigate = useNavigate();

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

  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment);
    setIsDetailsDialogOpen(true);
  };

  const handleCheckoutFromAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    const startDate = new Date(appointment.start_time);
    setAppointmentDate(startDate);
    setAppointmentTime(format(startDate, 'HH:mm'));
    setIsDetailsDialogOpen(false);
    
    // Navigate to appointment page with ID
    navigate(`/admin/bookings/appointment/${appointment.id}`);
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RecentSales
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          locations={locations}
          recentSalesLocationId={recentSalesLocationId}
          setRecentSalesLocationId={setRecentSalesLocationId}
        />
        <TodaysAppointments
          locations={locations}
          todayAppointmentsLocationId={todayAppointmentsLocationId}
          setTodayAppointmentsLocationId={setTodayAppointmentsLocationId}
          onAppointmentClick={handleAppointmentClick}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UpcomingAppointments
          locations={locations}
          upcomingAppointmentsLocationId={upcomingAppointmentsLocationId}
          setUpcomingAppointmentsLocationId={setUpcomingAppointmentsLocationId}
        />
        <InventoryStatus
          locations={locations}
          inventoryLocationId={inventoryLocationId}
          setInventoryLocationId={setInventoryLocationId}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TopServices
          locations={locations}
          topServicesLocationId={topServicesLocationId}
          setTopServicesLocationId={setTopServicesLocationId}
        />
        <TopTeamMembers
          locations={locations}
          topStylistsLocationId={topStylistsLocationId}
          setTopStylistsLocationId={setTopStylistsLocationId}
        />
      </div>
      <AppointmentDetailsDialog 
        appointment={selectedAppointment}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        onUpdated={() => {}}
        onCheckout={handleCheckoutFromAppointment}
        onEdit={() => handleCheckoutFromAppointment(selectedAppointment)}
      />
    </div>
  );
}
