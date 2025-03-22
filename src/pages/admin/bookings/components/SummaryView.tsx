
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatPrice } from "@/lib/utils";
import { Calendar, Clock, CheckCircle2, User, IndianRupee, Package, CreditCard, FileText } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface SummaryViewProps {
  appointmentId: string;
}

export const SummaryView: React.FC<SummaryViewProps> = ({ appointmentId }) => {
  const [appointment, setAppointment] = useState<any | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAppointmentDetails = async () => {
      setIsLoading(true);
      try {
        // Get appointment details
        const { data: appointmentData, error: appointmentError } = await supabase
          .from("appointments")
          .select(`
            *,
            customer:profiles(*),
            tax:tax_rates(*),
            coupon:coupons(*),
            membership:memberships(*)
          `)
          .eq("id", appointmentId)
          .single();

        if (appointmentError) throw appointmentError;
        
        setAppointment(appointmentData);

        // Get booking details
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select(`
            *,
            service:services(*),
            package:packages(*),
            employee:employees(*)
          `)
          .eq("appointment_id", appointmentId)
          .order("start_time");

        if (bookingsError) throw bookingsError;
        setBookings(bookingsData || []);
      } catch (error: any) {
        console.error("Error fetching appointment details:", error);
        toast.error(`Error fetching details: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (appointmentId) {
      fetchAppointmentDetails();
    }
  }, [appointmentId]);

  if (isLoading) {
    return <div className="p-8 text-center">Loading appointment details...</div>;
  }

  if (!appointment) {
    return <div className="p-8 text-center">Appointment not found</div>;
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`;
    }
    return `${minutes}m`;
  };

  // Group bookings by package
  const groupedBookings = bookings.reduce((acc, booking) => {
    if (booking.package_id) {
      if (!acc.packages[booking.package_id]) {
        const packageInfo = bookings.find(b => b.package?.id === booking.package_id)?.package;
        acc.packages[booking.package_id] = {
          id: booking.package_id,
          package: packageInfo,
          services: []
        };
      }
      acc.packages[booking.package_id].services.push(booking);
    } else {
      acc.services.push(booking);
    }
    return acc;
  }, { services: [], packages: {} });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex justify-center items-center h-20 w-20 rounded-full bg-green-50 mb-4">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Appointment Confirmed!</h2>
        <p className="text-muted-foreground">
          The appointment has been successfully booked and confirmed.
        </p>
      </div>

      <Card className="bg-background">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:justify-between">
            <div>
              <h3 className="font-medium text-lg mb-1">Customer Details</h3>
              <div className="space-y-1">
                <p className="font-medium">{appointment.customer?.full_name}</p>
                <p className="text-sm text-muted-foreground">{appointment.customer?.email}</p>
                {appointment.customer?.phone_number && (
                  <p className="text-sm text-muted-foreground">{appointment.customer?.phone_number}</p>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-lg mb-1">Appointment Details</h3>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(appointment.start_time), "EEEE, MMMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(appointment.start_time), "h:mm a")} - {format(new Date(appointment.end_time), "h:mm a")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span>{appointment.number_of_bookings} services • {formatDuration(appointment.total_duration)}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-lg mb-1">Payment Details</h3>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="capitalize">{appointment.payment_method}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{formatPrice(appointment.total_price)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline" className="rounded-sm text-xs">
                    {appointment.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />
          
          <div>
            <h3 className="font-medium text-lg mb-4">Services</h3>
            <div className="space-y-3">
              {/* Individual Services */}
              {groupedBookings.services.map((booking) => (
                <div key={booking.id} className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{booking.service?.name}</div>
                    <div className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(booking.start_time), "h:mm a")}
                      </div>
                      {booking.employee && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {booking.employee.name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div>{formatPrice(booking.price_paid)}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDuration(booking.service?.duration)}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Packages */}
              {Object.values(groupedBookings.packages).map((pkg: any) => (
                <div key={pkg.id} className="pt-2">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{pkg.package?.name} Package</div>
                      <div className="text-sm text-muted-foreground">
                        {pkg.services.length} services
                      </div>
                    </div>
                    <div className="text-right">
                      <div>{formatPrice(pkg.package?.price)}</div>
                    </div>
                  </div>
                  
                  <div className="ml-4 space-y-1 pl-2 border-l text-sm">
                    {pkg.services.map((booking: any) => (
                      <div key={booking.id} className="flex justify-between items-center">
                        <div>
                          <div>{booking.service?.name}</div>
                          {booking.employee && (
                            <div className="text-xs text-muted-foreground">
                              Stylist: {booking.employee.name}
                            </div>
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          {formatDuration(booking.service?.duration)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />

          <div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>
                  {formatPrice(appointment.total_price - (appointment.tax_amount || 0))}
                </span>
              </div>
              
              {(appointment.discount_type !== 'none' && appointment.discount_value > 0) && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Discount 
                    {appointment.discount_type === 'percentage' 
                      ? ` (${appointment.discount_value}%)` 
                      : ''}
                  </span>
                  <span className="text-green-600">
                    -{formatPrice(appointment.discount_value)}
                  </span>
                </div>
              )}

              {appointment.membership && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Membership: {appointment.membership.name}
                  </span>
                </div>
              )}
              
              {appointment.coupon && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Coupon: {appointment.coupon.code}
                  </span>
                </div>
              )}
              
              {appointment.tax_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {appointment.tax?.name} ({appointment.tax?.percentage}%)
                  </span>
                  <span>{formatPrice(appointment.tax_amount)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-medium text-lg pt-2 border-t mt-2">
                <span>Total</span>
                <span>{formatPrice(appointment.total_price)}</span>
              </div>
            </div>
          </div>
          
          {appointment.notes && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Notes</h4>
                <p className="text-sm text-muted-foreground">{appointment.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      <div className="flex justify-center">
        <Button variant="outline" onClick={() => window.print()}>
          Print Receipt
        </Button>
      </div>
    </div>
  );
};
