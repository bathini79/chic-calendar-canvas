import React, { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { MoreVertical, Edit, Trash, UserPlus, CheckCircle, XCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Customer } from "./bookings/types";
import { formatTime } from "@/lib/time";
import { toast } from "sonner";
import { ServiceSelector } from "./bookings/components/ServiceSelector";

export default function AdminBookings() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false);
  const [clickedCell, setClickedCell] = useState<{ time: string } | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [customizedPackageServices, setCustomizedPackageServices] = useState<Record<string, string[]>>({});

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*');
      
      if (error) throw error;
      return data as Customer[];
    },
  });

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: packages } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: appointments, refetch: refetchAppointments } = useQuery({
    queryKey: ['appointments', currentDate],
    queryFn: async () => {
      const startOfDay = new Date(currentDate);
      startOfDay.setHours(0, 0, 0, 0);
  
      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);
  
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          bookings (
            *,
            service:services (*),
            package:packages (*)
          ),
          customer:customers (*)
        `)
        .gte('start_time', startOfDay.toISOString())
        .lte('end_time', endOfDay.toISOString());
  
      if (error) throw error;
      return data;
    },
  });

  const times = Array.from({ length: 24 }, (_, i) => {
    const hour = i % 24;
    const ampm = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:00${ampm}`;
  });

  const filteredCustomers = customers?.filter(customer =>
    customer.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAddAppointment = (time: string) => {
    setClickedCell({ time });
    setIsAddAppointmentOpen(true);
  };

  const closeAddAppointment = () => {
    setIsAddAppointmentOpen(false);
    setClickedCell(null);
    setSelectedCustomer(null);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen bg-gray-100">
        {/* Calendar - 20% */}
        <div className="w-[20%] p-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Calendar</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Calendar
                mode="single"
                captionLayout="dropdown"
                locale={enUS}
                selected={currentDate}
                onSelect={setCurrentDate}
                className="rounded-md border"
              />
              <p>
                <span className="font-medium">Selected Date:</span>{' '}
                {format(currentDate, 'PPP')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Schedule - 60% */}
        <div className="w-[60%] p-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Schedule for {format(currentDate, 'PPP')}
              </CardTitle>
            </CardHeader>
            <CardContent className="relative h-[calc(100%-80px)]">
              <ScrollArea className="h-full">
                <div className="grid grid-cols-[60px_1fr] border-b sticky top-0 z-10 bg-background">
                  <div></div>
                  <div className="grid grid-cols-1">
                    <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                      {format(currentDate, 'EEEE')}
                    </div>
                  </div>
                </div>
                {times.map((time) => (
                  <div key={time} className="grid grid-cols-[60px_1fr] border-b">
                    <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                      {time}
                    </div>
                    <div
                      className="grid grid-cols-1 hover:bg-secondary/50 cursor-pointer"
                      onClick={() => openAddAppointment(time)}
                    >
                      <div className="px-2 py-1.5 text-sm">
                        {appointments?.filter(appointment => {
                          const startTime = formatTime(appointment.start_time);
                          return startTime === time;
                        }).map(appointment => (
                          <div key={appointment.id} className="relative group">
                            <div className="bg-primary text-primary-foreground rounded-md p-2 mb-1">
                              <p className="font-medium">{appointment.customer?.full_name}</p>
                              <p className="text-sm">{appointment.bookings?.map(booking => booking.service?.name).join(', ')}</p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 h-6 w-6 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[160px]">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>Edit</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Trash className="mr-2 h-4 w-4" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <UserPlus className="mr-2 h-4 w-4" />
                                  <span>Invite to team</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Add Appointment Panel - 20% */}
        <div
          className={cn(
            "fixed inset-y-0 right-0 w-[40%] bg-gray-50 border-l border-gray-200 p-6 transform transition-transform duration-300 ease-in-out z-50",
            isAddAppointmentOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Add Appointment</h2>
              <Button variant="ghost" onClick={closeAddAppointment}>
                <XCircle className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex space-x-4 h-full">
              {/* Customer Selection Panel - 40% */}
              <div className="w-[40%] overflow-y-auto p-6">
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Select Customer</h3>
                  <Input
                    type="search"
                    placeholder="Search customers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <ScrollArea className="h-[300px] border rounded-md">
                    <div className="divide-y divide-gray-200">
                      {filteredCustomers?.map((customer) => (
                        <div
                          key={customer.id}
                          className="flex items-center space-x-4 p-4 hover:bg-gray-100 cursor-pointer"
                          onClick={() => setSelectedCustomer(customer)}
                        >
                          <Avatar>
                            <AvatarImage src={`https://avatar.vercel.sh/${customer.email}.png`} />
                            <AvatarFallback>{customer.full_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium leading-none">{customer.full_name}</p>
                            <p className="text-sm text-muted-foreground">{customer.email}</p>
                          </div>
                          {selectedCustomer?.id === customer.id && (
                            <CheckCircle className="h-5 w-5 ml-auto text-green-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  {selectedCustomer && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Selected Customer</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center space-x-4">
                          <Avatar>
                            <AvatarImage src={`https://avatar.vercel.sh/${selectedCustomer.email}.png`} />
                            <AvatarFallback>{selectedCustomer.full_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium leading-none">{selectedCustomer.full_name}</p>
                            <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Services Selection Panel - 60% */}
              <div className="w-[60%] overflow-y-auto p-6">
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Select Services</h3>
                  <ServiceSelector
                    onServiceSelect={(serviceId) => {
                      setSelectedServices(prev => 
                        prev.includes(serviceId) 
                          ? prev.filter(id => id !== serviceId)
                          : [...prev, serviceId]
                      );
                    }}
                    onPackageSelect={(packageId, services) => {
                      setSelectedPackages(prev => 
                        prev.includes(packageId)
                          ? prev.filter(id => id !== packageId)
                          : [...prev, packageId]
                      );
                      
                      if (services.length > 0) {
                        setCustomizedPackageServices(prev => ({
                          ...prev,
                          [packageId]: services
                        }));
                      } else {
                        setCustomizedPackageServices(prev => {
                          const newState = { ...prev };
                          delete newState[packageId];
                          return newState;
                        });
                      }
                    }}
                    selectedServices={selectedServices}
                    selectedPackages={selectedPackages}
                  />
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-t p-6">
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline" 
                  onClick={() => {
                    closeAddAppointment();
                    setSelectedServices([]);
                    setSelectedPackages([]);
                    setCustomizedPackageServices({});
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      if (!selectedCustomer || !clickedCell) {
                        toast.error("Please select a customer and appointment time");
                        return;
                      }

                      if (selectedServices.length === 0 && selectedPackages.length === 0) {
                        toast.error("Please select at least one service or package");
                        return;
                      }

                      // Calculate start time
                      const startTime = new Date(currentDate);
                      const [hours, minutes] = formatTime(clickedCell.time)
                        .replace(/[ap]m/, '')
                        .split(':')
                        .map(Number);
                      startTime.setHours(hours, minutes, 0, 0);

                      // Calculate total duration and price
                      let totalDuration = 0;
                      let totalPrice = 0;

                      // Add service durations and prices
                      selectedServices.forEach(serviceId => {
                        const service = services?.find(s => s.id === serviceId);
                        if (service) {
                          totalDuration += service.duration;
                          totalPrice += service.selling_price;
                        }
                      });

                      // Add package durations and prices
                      selectedPackages.forEach(packageId => {
                        const pkg = packages?.find(p => p.id === packageId);
                        if (pkg) {
                          totalDuration += pkg.duration;
                          totalPrice += pkg.price;
                        }
                      });

                      // Calculate end time
                      const endTime = new Date(startTime);
                      endTime.setMinutes(endTime.getMinutes() + totalDuration);

                      // Create appointment
                      const { data: appointment, error: appointmentError } = await supabase
                        .from('appointments')
                        .insert({
                          customer_id: selectedCustomer.id,
                          start_time: startTime.toISOString(),
                          end_time: endTime.toISOString(),
                          status: 'confirmed',
                          total_price: totalPrice,
                          total_duration: totalDuration
                        })
                        .select()
                        .single();

                      if (appointmentError) throw appointmentError;

                      // Create bookings for services
                      const serviceBookings = selectedServices.map(serviceId => ({
                        appointment_id: appointment.id,
                        service_id: serviceId,
                        status: 'confirmed',
                        price_paid: services?.find(s => s.id === serviceId)?.selling_price || 0
                      }));

                      // Create bookings for packages
                      const packageBookings = selectedPackages.map(packageId => ({
                        appointment_id: appointment.id,
                        package_id: packageId,
                        status: 'confirmed',
                        price_paid: packages?.find(p => p.id === packageId)?.price || 0,
                        customized_services: customizedPackageServices[packageId] || []
                      }));

                      // Insert all bookings
                      const { error: bookingsError } = await supabase
                        .from('bookings')
                        .insert([...serviceBookings, ...packageBookings]);

                      if (bookingsError) throw bookingsError;

                      toast.success("Appointment created successfully");
                      closeAddAppointment();
                      setSelectedServices([]);
                      setSelectedPackages([]);
                      setCustomizedPackageServices({});
                      refetchAppointments();
                    } catch (error: any) {
                      console.error('Error creating appointment:', error);
                      toast.error(error.message);
                    }
                  }}
                >
                  Save Appointment
                </Button>
              </div>
            </div>

          </div>
        </div>

        {/* Backdrop */}
        {isAddAppointmentOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={closeAddAppointment}
          />
        )}
      </div>
    </DndProvider>
  );
}
