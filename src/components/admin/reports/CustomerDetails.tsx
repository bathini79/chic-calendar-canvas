import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Calendar, 
  CreditCard, 
  Facebook, 
  Instagram, 
  Loader, 
  Mail, 
  Phone, 
  Twitter, 
  UserCircle, 
  Wallet 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';

interface CustomerDetailsProps {
  customerId: string;
  onBack: () => void;
}

export function CustomerDetails({ customerId, onBack }: CustomerDetailsProps) {
  // Fetch customer profile data
  const { data: customer, isLoading: isLoadingCustomer, error: customerError } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', customerId)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch customer appointments
  const { data: appointments, isLoading: isLoadingAppointments, error: appointmentsError } = useQuery({
    queryKey: ['customer-appointments', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          bookings:bookings(
            id, 
            service_id, 
            package_id, 
            employee_id, 
            price_paid,
            services:service_id(name),
            packages:package_id(name),
            employees:employee_id(name)
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!customer
  });

  // Calculate customer metrics
  const customerMetrics = React.useMemo(() => {
    if (!appointments) return null;

    // Total spent
    const lifetimeSpent = appointments.reduce((total, appointment) => {
      return total + (appointment.total_price || 0);
    }, 0);

    // Last three appointments average
    const lastThree = appointments.slice(0, 3);
    const lastThreeAvg = lastThree.length 
      ? lastThree.reduce((total, appt) => total + (appt.total_price || 0), 0) / lastThree.length 
      : 0;

    // Last visit date
    const lastVisitDate = appointments.length > 0 ? appointments[0].start_time : null;

    // Calculate retention rate (simplified version)
    // For a more accurate rate, we'd need to define specific time periods
    const monthsActive = customer?.created_at 
      ? Math.max(1, Math.floor((new Date().getTime() - new Date(customer.created_at).getTime()) / (30 * 24 * 60 * 60 * 1000))) 
      : 1;
    
    const appointmentsPerMonth = appointments.length / monthsActive;
    
    // Simple retention score (higher is better)
    const retentionScore = Math.min(100, Math.round(
      (appointmentsPerMonth * 25) + 
      (appointments.length > 0 ? 25 : 0) + 
      (lastVisitDate && new Date(lastVisitDate).getTime() > Date.now() - (90 * 24 * 60 * 60 * 1000) ? 50 : 0)
    ));

    return {
      totalBookings: appointments.length,
      lifetimeSpent,
      lastThreeAvg,
      lastVisitDate,
      retentionScore
    };
  }, [appointments, customer]);

  // Loading state
  if (isLoadingCustomer || isLoadingAppointments) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin mb-4" />
        <p className="text-muted-foreground">Loading customer data...</p>
      </div>
    );
  }

  // Error state
  if (customerError || appointmentsError) {
    return (
      <div className="p-6">
        <Button onClick={onBack} variant="outline" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to customer list
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-500 font-medium mb-2">Error loading customer data</p>
              <p className="text-muted-foreground">
                {((customerError || appointmentsError) as Error)?.message || 'An unexpected error occurred'}
              </p>
              <Button 
                className="mt-4" 
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <Button onClick={onBack} variant="outline" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to customer list
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground">Customer not found</p>
              <Button className="mt-4" onClick={onBack}>
                Return to Customer List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack} className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{customer.full_name || 'Customer details'}</h2>
            <p className="text-sm text-muted-foreground">Customer profile and booking history</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer basic info card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center mb-6">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarFallback className="text-xl">
                  {(customer.full_name || 'User')
                    .split(' ')
                    .map(name => name[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-semibold">{customer.full_name || 'N/A'}</h3>
              
              <div className="mt-4 space-y-2 w-full">
                <div className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Gender: {customer.gender || 'Not specified'}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{customer.phone_number || 'No phone number'}</span>
                </div>                
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{customer.email || 'No email'}</span>
                </div>
                
                {customer.birth_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Birth date: {format(new Date(customer.birth_date), 'dd MMM yyyy')}
                    </span>
                  </div>
                )}
                
                {customer.anniversary_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Anniversary: {format(new Date(customer.anniversary_date), 'dd MMM yyyy')}
                    </span>
                  </div>
                )}
                
                {customer.lead_source && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Source: {customer.lead_source}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Social Media</h4>
              <div className="flex gap-2">
                {customer.facebook_url && (
                  <a 
                    href={customer.facebook_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-muted hover:bg-muted/80"
                  >
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                
                {customer.instagram_url && (
                  <a 
                    href={customer.instagram_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-muted hover:bg-muted/80"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                
                {customer.twitter_url && (
                  <a 
                    href={customer.twitter_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-muted hover:bg-muted/80"
                  >
                    <Twitter className="h-4 w-4" />
                  </a>
                )}
                
                {!customer.facebook_url && !customer.instagram_url && !customer.twitter_url && (
                  <span className="text-sm text-muted-foreground">No social media links</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer overview and metrics */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Overview & Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <h4 className="font-medium">Wallet Balance</h4>
                </div>
                <p className="text-2xl font-semibold">{formatPrice(customer.wallet_balance || 0)}</p>
              </div>
              
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h4 className="font-medium">Cashback Balance</h4>
                </div>
                <p className="text-2xl font-semibold">{formatPrice(customer.cashback_balance || 0)}</p>
              </div>
              
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h4 className="font-medium">Lifetime Spent</h4>
                </div>
                <p className="text-2xl font-semibold">{formatPrice(customerMetrics?.lifetimeSpent || 0)}</p>
              </div>
              
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h4 className="font-medium">Last 3 Bookings Avg.</h4>
                </div>
                <p className="text-2xl font-semibold">{formatPrice(customerMetrics?.lastThreeAvg || 0)}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h4 className="font-medium">Total Bookings</h4>
                </div>
                <p className="text-2xl font-semibold">{customerMetrics?.totalBookings || 0}</p>
              </div>
              
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h4 className="font-medium">Last Visit</h4>
                </div>
                <p className="text-2xl font-semibold">
                  {customerMetrics?.lastVisitDate 
                    ? format(new Date(customerMetrics.lastVisitDate), 'dd MMM yyyy')
                    : 'Never'
                  }
                </p>
              </div>
            </div>
            
            <div className="mt-6 bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-primary" />
                  <h4 className="font-medium">Retention Score</h4>
                </div>
                <Badge variant={
                  customerMetrics?.retentionScore && customerMetrics.retentionScore > 75 ? "default" :
                  customerMetrics?.retentionScore && customerMetrics.retentionScore > 50 ? "secondary" :
                  customerMetrics?.retentionScore && customerMetrics.retentionScore > 25 ? "outline" :
                  "destructive"
                }>
                  {customerMetrics?.retentionScore || 0}%
                </Badge>
              </div>
              <div className="w-full bg-muted-foreground/20 rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full" 
                  style={{ width: `${customerMetrics?.retentionScore || 0}%` }}
                ></div>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="font-medium mb-4">Activity Timeline</h4>
              <div className="relative border-l pl-6 pb-2">
                {appointments && appointments.length > 0 ? (
                  <>
                    <div className="mb-6">
                      <div className="absolute w-3 h-3 rounded-full bg-primary -left-1.5 top-0"></div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(customer.created_at), 'dd MMM yyyy')}
                      </p>
                      <p className="font-medium">Customer registered</p>
                    </div>
                    
                    {appointments.slice(0, 3).map((appointment, index) => (
                      <div key={appointment.id} className="mb-6">
                        <div className="absolute w-3 h-3 rounded-full bg-primary -left-1.5 top-0"></div>
                        <p className="text-sm text-muted-foreground">
                          {appointment.start_time 
                            ? format(new Date(appointment.start_time), 'dd MMM yyyy')
                            : format(new Date(appointment.created_at), 'dd MMM yyyy')
                          }
                        </p>
                        <p className="font-medium">
                          Booking {appointment.bookings && appointment.bookings.length > 0 
                            ? `for ${appointment.bookings.map((b: any) => 
                                b.services?.name || b.packages?.name || 'Service'
                              ).join(', ')}`
                            : ''
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Total amount: {formatPrice(appointment.total_price || 0)}
                        </p>
                      </div>
                    ))}
                    
                    {appointments.length > 3 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        + {appointments.length - 3} more bookings
                      </p>
                    )}
                  </>
                ) : (
                  <div className="mb-6">
                    <div className="absolute w-3 h-3 rounded-full bg-primary -left-1.5 top-0"></div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(customer.created_at), 'dd MMM yyyy')}
                    </p>
                    <p className="font-medium">Customer registered</p>
                    <p className="text-sm text-muted-foreground mt-2">No bookings yet</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for booking history */}
      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bookings">Booking History</TabsTrigger>
          <TabsTrigger value="financial">Financial History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="bookings" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {appointments && appointments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          {appointment.start_time 
                            ? format(new Date(appointment.start_time), 'dd MMM yyyy')
                            : format(new Date(appointment.created_at), 'dd MMM yyyy')
                          }
                        </TableCell>
                        <TableCell className="font-medium">{appointment.id.slice(0, 8)}</TableCell>
                        <TableCell>
                          {appointment.bookings && appointment.bookings.length > 0 
                            ? appointment.bookings.map((booking: any) => (
                                <div key={booking.id}>
                                  {booking.services?.name || booking.packages?.name || 'Service'}
                                </div>
                              ))
                            : 'N/A'
                          }
                        </TableCell>
                        <TableCell>
                          {appointment.bookings && appointment.bookings.length > 0 
                            ? appointment.bookings.map((booking: any) => (
                                <div key={booking.id}>
                                  {booking.employees?.name || 'N/A'}
                                </div>
                              ))
                            : 'N/A'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            appointment.status === 'canceled' ? 'destructive' :
                            'secondary'
                          }>
                            {appointment.status || 'booked'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatPrice(appointment.total_price || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No booking history found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {appointments && appointments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Transaction</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          {format(new Date(appointment.created_at), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {appointment.transaction_type === 'refund' ? 'Refund' : 'Payment'} for booking
                        </TableCell>
                        <TableCell>{appointment.payment_method || 'Cash'}</TableCell>
                        <TableCell>
                          <span className={appointment.transaction_type === 'refund' ? 'text-red-500' : 'text-green-500'}>
                            {appointment.transaction_type === 'refund' ? '- ' : '+ '}
                            {formatPrice(appointment.total_price || 0)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No financial history found</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Spent:</span>
                  <span className="font-medium">{formatPrice(customerMetrics?.lifetimeSpent || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Booking Value:</span>
                  <span className="font-medium">
                    {formatPrice(
                      customerMetrics?.totalBookings && customerMetrics.totalBookings > 0
                        ? (customerMetrics.lifetimeSpent || 0) / customerMetrics.totalBookings
                        : 0
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Wallet Balance:</span>
                  <span className="font-medium">{formatPrice(customer.wallet_balance || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cashback Balance:</span>
                  <span className="font-medium">{formatPrice(customer.cashback_balance || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
