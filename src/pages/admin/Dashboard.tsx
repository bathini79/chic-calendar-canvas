import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Calendar as CalendarIcon, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  customer_id: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
  discount_type: string;
  discount_value: number;
  payment_method?: string;
  notes?: string;
  location?: string;
  number_of_bookings?: number;
  created_at: string;
  updated_at: string;
  original_appointment_id?: string;
  refund_notes?: string;
  transaction_type?: string;
  refunded_by?: string;
  original_total_price?: number;
  refund_reason?: string;
  total_duration?: number;
  customer?: {
    id: string;
    full_name?: string;
    email?: string;
    phone_number?: string;
    created_at: string;
    updated_at: string;
  };
  bookings: any[];
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  minimum_quantity: number;
}

export default function Dashboard() {
  const [date, setDate] = useState<Date>(new Date());
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const navigate = useNavigate();

  const formattedDate = format(date, 'PPP');
  const formattedDateForQuery = format(date, 'yyyy-MM-dd');

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['appointments', formattedDateForQuery, selectedLocation],
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          customer:customers(*)
        `)
        .gte('start_time', startOfDay(date).toISOString())
        .lte('start_time', endOfDay(date).toISOString())
        .order('start_time');

      if (selectedLocation !== 'all') {
        query = query.eq('location', selectedLocation);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Appointment[];
    },
  });

  const { data: recentCustomers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['recent-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });

  // Update the inventory query
  const { data: lowInventoryItems, isLoading: inventoryLoading } = useQuery({
    queryKey: ['low-inventory', selectedLocation],
    queryFn: async () => {
      let query = supabase
        .from('inventory_items')
        .select('id, name, quantity, minimum_quantity')
        .lt('quantity', supabase.raw('minimum_quantity'))
        .limit(5);
    
      if (selectedLocation !== 'all') {
        // For location-specific inventory
        const { data, error } = await supabase
          .from('inventory_location_items')
          .select('id, item_id, quantity, minimum_quantity')
          .eq('location_id', selectedLocation)
          .lt('quantity', supabase.raw('minimum_quantity'))
          .limit(5);
      
        if (error) throw error;
      
        // If location-specific inventory exists, get the item details
        if (data && data.length > 0) {
          const itemIds = data.map(item => item.item_id);
          const { data: itemDetails, error: itemError } = await supabase
            .from('inventory_items')
            .select('id, name')
            .in('id', itemIds);
        
          if (itemError) throw itemError;
        
          // Combine the item details with the location-specific inventory
          return data.map(item => {
            const details = itemDetails.find(i => i.id === item.item_id);
            return {
              id: item.id,
              item_id: item.item_id,
              name: details?.name || 'Unknown Item',
              quantity: item.quantity,
              minimum_quantity: item.minimum_quantity
            };
          });
        }
      }
    
      // Default for all locations or if no location-specific inventory
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const handlePreviousDay = () => {
    setDate((prev) => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setDate((prev) => {
      const tomorrow = new Date();
      tomorrow.setDate(prev.getDate() + 1);
      return tomorrow > new Date() ? prev : new Date(prev.setDate(prev.getDate() + 1));
    });
  };

  return (
    <div className="container max-w-7xl mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Appointments
            </CardTitle>
            <div className="space-x-2">
              <Button size="sm" variant="outline" onClick={handlePreviousDay}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              <Button size="sm" variant="outline" onClick={handleNextDay}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'w-[300px] justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    {date ? formattedDate : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) =>
                      date > new Date() || date < new Date('2020-01-01')
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select onValueChange={setSelectedLocation} defaultValue={selectedLocation}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointments for {formattedDate}</CardTitle>
          <CardContent>
            {appointmentsLoading ? (
              <div>Loading appointments...</div>
            ) : appointments.length > 0 ? (
              <ScrollArea>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Avatar>
                              <AvatarImage src={appointment.customer?.avatar} />
                              <AvatarFallback>{appointment.customer?.full_name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span>{appointment.customer?.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(appointment.start_time), 'h:mm a')}
                        </TableCell>
                        <TableCell>
                          {appointment.bookings.map((booking: any) => (
                            <div key={booking.id} className="flex items-center space-x-1">
                              <Badge variant="secondary">{booking.service?.name}</Badge>
                            </div>
                          ))}
                        </TableCell>
                        <TableCell>{appointment.status}</TableCell>
                        <TableCell className="text-right">{appointment.total_price}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div>No appointments for this day</div>
            )}
          </CardContent>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Customers</CardTitle>
          </CardHeader>
          <CardContent>
            {customersLoading ? (
              <div>Loading customers...</div>
            ) : recentCustomers.length > 0 ? (
              <div className="space-y-4">
                {recentCustomers.map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{customer.full_name}</p>
                      <p className="text-xs text-muted-foreground">{customer.email}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/customers/${customer.id}`)}
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div>No recent customers</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Stock Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            {!inventoryLoading && lowInventoryItems && lowInventoryItems.length > 0 ? (
              <div className="space-y-4">
                {lowInventoryItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Only {item.quantity} units left (min: {item.minimum_quantity})
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/inventory')}
                    >
                      Restock
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No low stock items</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
