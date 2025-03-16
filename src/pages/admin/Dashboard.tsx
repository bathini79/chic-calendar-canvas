import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ArrowRight, ArrowLeft, UserPlus, DollarSign, ShoppingCart, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppointmentManager } from './bookings/components/AppointmentManager';
import { Appointment } from './bookings/types';
import { toast } from 'sonner';
import { Progress } from "@/components/ui/progress"

interface AppointmentStats {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  pendingAppointments: number;
  totalRevenue: number;
  newCustomers: number;
}

export default function Dashboard() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [appointmentStats, setAppointmentStats] = useState<AppointmentStats>({
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    pendingAppointments: 0,
    totalRevenue: 0,
    newCustomers: 0,
  });
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [locations, setLocations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [selectedAppointmentTime, setSelectedAppointmentTime] = useState<string>('09:00');

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      fetchEmployees();
      fetchAppointmentsStats();
    }
  }, [selectedLocation, date]);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      setLocations(data || []);
      
      // Select the first location by default if available
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

  const fetchAppointmentsStats = async () => {
    try {
      if (!selectedLocation) return;

      const formattedDate = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

      const { data: stats, error: statsError } = await supabase.rpc('get_appointment_stats', {
        input_date: formattedDate,
        location_id: selectedLocation
      });

      if (statsError) {
        console.error('Error fetching appointment stats:', statsError);
        toast.error('Error fetching appointment stats');
        return;
      }

      setAppointmentStats({
        totalAppointments: stats?.total_appointments || 0,
        completedAppointments: stats?.completed_appointments || 0,
        cancelledAppointments: stats?.cancelled_appointments || 0,
        pendingAppointments: stats?.pending_appointments || 0,
        totalRevenue: stats?.total_revenue || 0,
        newCustomers: stats?.new_customers || 0,
      });
    } catch (error) {
      console.error('Error fetching appointment stats:', error);
      toast.error('Error fetching appointment stats');
    }
  };

  const handleCreateAppointment = () => {
    setShowAppointmentForm(true);
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
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
            New Appointment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Total Appointments
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointmentStats.totalAppointments}</div>
            <p className="text-sm text-muted-foreground">For {date ? format(date, 'MMM dd, yyyy') : format(new Date(), 'MMM dd, yyyy')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Completed Appointments
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointmentStats.completedAppointments}</div>
            <p className="text-sm text-muted-foreground">For {date ? format(date, 'MMM dd, yyyy') : format(new Date(), 'MMM dd, yyyy')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Pending Appointments
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointmentStats.pendingAppointments}</div>
            <p className="text-sm text-muted-foreground">For {date ? format(date, 'MMM dd, yyyy') : format(new Date(), 'MMM dd, yyyy')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Total Revenue
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${appointmentStats.totalRevenue.toFixed(2)}</div>
            <p className="text-sm text-muted-foreground">For {date ? format(date, 'MMM dd, yyyy') : format(new Date(), 'MMM dd, yyyy')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Appointments Calendar</CardTitle>
            <div className="space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[280px] justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) =>
                      date > new Date()
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent className="pl-2 pt-0">
            <div className="w-full">
              <Progress value={(appointmentStats.completedAppointments / appointmentStats.totalAppointments) * 100} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-0">
            <CardTitle>New Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointmentStats.newCustomers}</div>
            <p className="text-sm text-muted-foreground">For {date ? format(date, 'MMM dd, yyyy') : format(new Date(), 'MMM dd, yyyy')}</p>
          </CardContent>
        </Card>
      </div>

      {showAppointmentForm && (
        <AppointmentManager
          onClose={() => setShowAppointmentForm(false)}
          selectedDate={date}
          selectedTime={selectedAppointmentTime}
          employees={employees}
          onAppointmentCreated={() => {
            fetchAppointmentsStats();
            setShowAppointmentForm(false);
          }}
          locationId={selectedLocation}
        />
      )}
    </div>
  );
}
