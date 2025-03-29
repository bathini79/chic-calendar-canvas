
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { LocationSelector } from './LocationSelector';
import { useAppointmentsByDate } from '@/pages/admin/bookings/hooks/useAppointmentsByDate';

export const TodaysAppointments = ({ locations, todayAppointmentsLocationId, setTodayAppointmentsLocationId, onAppointmentClick }) => {
  const today = new Date();
  const { data: appointments = [], isLoading } = useAppointmentsByDate(
    today,
    todayAppointmentsLocationId !== "all" ? todayAppointmentsLocationId : undefined
  );

  const formatAppointmentStatus = (status) => {
    const styles = {
      confirmed: "px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800",
      pending: "px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800",
      canceled: "px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800",
      completed: "px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800",
      booked: "px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800"
    };
    return <span className={styles[status] || "px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800"}>{status.toUpperCase()}</span>;
  };

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 space-y-2 sm:space-y-0">
        <CardTitle className="text-lg">Today's Next Appointments</CardTitle>
        <div className="w-full sm:w-auto">
          <LocationSelector value={todayAppointmentsLocationId} onChange={setTodayAppointmentsLocationId} locations={locations} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">Booked: {appointments.filter(a => a.status === 'booked').length}</span>
              <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">Confirmed: {appointments.filter(a => a.status === 'confirmed').length}</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">Total appointments: {appointments.length}</p>
        </div>
        <ScrollArea className="h-[300px] pr-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-40"><p>Loading appointments...</p></div>
          ) : appointments.length > 0 ? (
            <div className="space-y-2">
              {appointments.map(appointment => {
                const mainBooking = appointment.bookings?.[0];
                const serviceName = mainBooking?.service?.name || mainBooking?.package?.name || "Appointment";
                const price = mainBooking?.price_paid || appointment.total_price || 0;
                const stylist = mainBooking?.employee?.name;
                return (
                  <div 
                    key={appointment.id} 
                    className="flex items-start hover:bg-gray-50 p-3 rounded cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 focus:bg-gray-100 focus:outline-none"
                    onClick={() => onAppointmentClick(appointment)}
                    tabIndex={0}
                  >
                    <div className="mr-4 text-center flex-shrink-0">
                      <div className="font-bold">{format(new Date(appointment.start_time), "HH:mm")}</div>
                    </div>
                    <div className="flex flex-1 flex-col sm:flex-row justify-between gap-2">
                      <div>
                        <div className="font-medium truncate max-w-[200px] sm:max-w-none">{serviceName}</div>
                        <div className="text-sm text-gray-500 truncate max-w-[200px] sm:max-w-none">{appointment.customer?.full_name} {stylist && `with ${stylist}`}</div>
                      </div>
                      <div className="sm:text-right">
                        <div className="font-bold">₹{price.toFixed(2)}</div>
                        <div className="mt-1">{formatAppointmentStatus(appointment.status)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Clock className="w-12 h-12 mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold mb-2">No Appointments Today</h3>
              <p className="text-sm text-gray-500 text-center mb-4">
                Visit the <a href="/admin/bookings" className="text-blue-500 hover:underline">calendar</a> section to add some appointments
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
