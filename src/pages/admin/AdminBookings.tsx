import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FullCalendar from '@fullcalendar/react';
import { Button } from '@/components/ui/button';
import { CalendarHeader } from './bookings/components/CalendarHeader';
import { AppointmentManager } from './bookings/components/AppointmentManager';
import { Appointment } from './bookings/types';
import { AppointmentDetailsDialog } from './bookings/components/AppointmentDetailsDialog';
import { Calendar as CalendarIcon } from 'lucide-react';
import TimeSlots from './bookings/components/TimeSlots';

export default function AdminBookings() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  const [selectedAppointmentDate, setSelectedAppointmentDate] = useState<Date>(new Date());
  const [selectedAppointmentTime, setSelectedAppointmentTime] = useState<string>('09:00');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [locations, setLocations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      fetchEmployees();
      fetchAppointments();
    }
  }, [selectedLocation]);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      
      setLocations(data || []);
      
      if (data && data.length > 0) {
        setSelectedLocation(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      if (!selectedLocation) return;
      
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          employee_locations!inner(location_id)
        `)
        .eq('employee_locations.location_id', selectedLocation)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      if (!selectedLocation) return;
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:profiles!appointments_customer_id_fkey(*),
          bookings(
            *,
            service:services(*),
            package:packages(*),
            employee:employees!bookings_employee_id_fkey(*)
          )
        `)
        .eq('location', selectedLocation)
        .gte('start_time', new Date(new Date().setDate(new Date().getDate() - 14)).toISOString())
        .lte('start_time', new Date(new Date().setDate(new Date().getDate() + 30)).toISOString())
        .order('start_time');

      if (error) throw error;
      
      setAppointments(data as Appointment[]);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const handleCreateAppointment = () => {
    setSelectedAppointment(null);
    setShowCreateForm(true);
  };

  const handleAppointmentClick = (info: any) => {
    const appointmentId = info.event.id;
    const appointment = appointments.find(a => a.id === appointmentId);
    
    if (appointment) {
      setSelectedAppointment(appointment);
      setShowDetailsDialog(true);
    }
  };

  const handleDetailsClose = (refresh?: boolean) => {
    setShowDetailsDialog(false);
    if (refresh) {
      fetchAppointments();
    }
  };

  const handleAppointmentCreated = () => {
    setShowCreateForm(false);
    fetchAppointments();
  };

  const renderAppointments = () => {
    if (!appointments.length) return [];
    
    return appointments.map(appointment => {
      let title = `${appointment.customer?.full_name || 'No Customer'}`;
      if (appointment.bookings && appointment.bookings.length > 0) {
        title += ` - ${appointment.bookings.length} service(s)`;
      }
      
      let backgroundColor;
      switch (appointment.status) {
        case 'completed':
          backgroundColor = '#4caf50';
          break;
        case 'canceled':
        case 'voided':
          backgroundColor = '#f44336';
          break;
        case 'pending':
          backgroundColor = '#ff9800';
          break;
        case 'confirmed':
          backgroundColor = '#2196f3';
          break;
        case 'noshow':
          backgroundColor = '#9c27b0';
          break;
        case 'refunded':
        case 'partially_refunded':
          backgroundColor = '#795548';
          break;
        default:
          backgroundColor = '#607d8b';
      }
      
      return {
        id: appointment.id,
        title,
        start: appointment.start_time,
        end: appointment.end_time,
        backgroundColor,
        borderColor: backgroundColor,
        textColor: '#ffffff',
        extendedProps: {
          status: appointment.status,
          price: appointment.total_price
        }
      };
    });
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Appointments</h1>
          <div className="flex gap-4 items-center">
            {locations.length > 0 && (
              <select
                className="px-3 py-2 border rounded-md"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                {locations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            )}
            <Button onClick={handleCreateAppointment}>
              <CalendarIcon className="h-4 w-4 mr-2" /> New Appointment
            </Button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-0">
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: 'calc(100vh - 300px)' }}>
              <FullCalendar
                plugins={[]}
                initialView="timeGridWeek"
                headerToolbar={false}
                events={renderAppointments()}
                eventClick={handleAppointmentClick}
                height="100%"
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-0">
            <CardTitle>Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
              <TimeSlots
                appointments={appointments.filter(a => 
                  new Date(a.start_time).toDateString() === new Date().toDateString()
                )}
                onCreateClick={handleCreateAppointment}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {showCreateForm && (
        <AppointmentManager
          onClose={() => setShowCreateForm(false)}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          employees={employees}
          onAppointmentCreated={handleAppointmentCreated}
          locationId={selectedLocation}
        />
      )}
      
      {showDetailsDialog && selectedAppointment && (
        <AppointmentDetailsDialog
          appointment={selectedAppointment}
          onOpenChange={(open) => {
            if (!open) handleDetailsClose();
          }}
        />
      )}
    </div>
  );
}
