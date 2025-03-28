import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { AppointmentDetailsDialog } from "./bookings/components/AppointmentDetailsDialog";
import { AppointmentManager } from "./bookings/components/AppointmentManager";
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
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState(null);
  const [appointmentTime, setAppointmentTime] = useState("");
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetchLocations();
    fetchEmployees();
    console.log("rr")
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
    setIsAddAppointmentOpen(true);
  };

  const closeAppointmentManager = () => {
    setIsAddAppointmentOpen(false);
    setSelectedAppointment(null);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 overflow-hidden">
        <div className="overflow-x-auto">
          <RecentSales
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            locations={locations}
            recentSalesLocationId={recentSalesLocationId}
            setRecentSalesLocationId={setRecentSalesLocationId}
          />
        </div>
        <div className="overflow-x-auto">
          <TodaysAppointments
            locations={locations}
            todayAppointmentsLocationId={todayAppointmentsLocationId}
            setTodayAppointmentsLocationId={setTodayAppointmentsLocationId}
            onAppointmentClick={handleAppointmentClick}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 overflow-hidden">
        <div className="overflow-x-auto">
          <UpcomingAppointments
            locations={locations}
            upcomingAppointmentsLocationId={upcomingAppointmentsLocationId}
            setUpcomingAppointmentsLocationId={setUpcomingAppointmentsLocationId}
          />
        </div>
        <div className="overflow-x-auto">
          <InventoryStatus
            locations={locations}
            inventoryLocationId={inventoryLocationId}
            setInventoryLocationId={setInventoryLocationId}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 overflow-hidden">
        <div className="overflow-x-auto">
          <TopServices
            locations={locations}
            topServicesLocationId={topServicesLocationId}
            setTopServicesLocationId={setTopServicesLocationId}
          />
        </div>
        <div className="overflow-x-auto">
          <TopTeamMembers
            locations={locations}
            topStylistsLocationId={topStylistsLocationId}
            setTopStylistsLocationId={setTopStylistsLocationId}
          />
        </div>
      </div>
      <AppointmentDetailsDialog 
        appointment={selectedAppointment}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        onUpdated={() => {}}
        onCheckout={handleCheckoutFromAppointment}
        onEdit={() => handleCheckoutFromAppointment(selectedAppointment)}
      />
      {isAddAppointmentOpen && appointmentDate && (
        <AppointmentManager
          isOpen={true}
          onClose={closeAppointmentManager}
          selectedDate={appointmentDate}
          selectedTime={appointmentTime}
          employees={employees}
          existingAppointment={selectedAppointment}
          locationId={todayAppointmentsLocationId !== "all" ? todayAppointmentsLocationId : undefined}
        />
      )}
    </div>
  );
}
