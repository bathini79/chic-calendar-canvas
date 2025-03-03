
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Clock, User, IndianRupee, Percent } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { calculatePackagePrice, getServicePriceInPackage } from "../utils/bookingUtils";

interface SummaryViewProps {
  appointmentId: string;
}

export const SummaryView = ({ appointmentId }: SummaryViewProps) => {
  const [appointment, setAppointment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);

  // Function to group bookings by package
  const groupBookingsByPackage = (bookings: any[]) => {
    const result = {
      packages: [] as any[],
      services: [] as any[]
    };

    // First, group by package_id
    const packageGroups: Record<string, any[]> = {};
    bookings.forEach(booking => {
      if (booking.package_id) {
        if (!packageGroups[booking.package_id]) {
          packageGroups[booking.package_id] = [];
        }
        packageGroups[booking.package_id].push(booking);
      } else if (booking.service_id) {
        result.services.push(booking);
      }
    });

    // Then create package entries with nested services
    Object.entries(packageGroups).forEach(([packageId, packageBookings]) => {
      // Find the package data
      const packageData = packages.find(p => p.id === packageId);
      if (!packageData) return;

      // Calculate the total price of this package (including any custom services)
      const packageServiceIds = packageBookings.map(b => b.service_id);
      const packageDuration = packageBookings.reduce((total, booking) => 
        total + (booking.service?.duration || 0), 0);
      
      // Find the first booking for this package to get time and stylist
      const firstBooking = packageBookings[0];
      
      result.packages.push({
        id: packageId,
        name: packageData.name,
        package: packageData,
        price: packageData.price,
        duration: packageDuration,
        start_time: firstBooking.start_time,
        end_time: packageBookings[packageBookings.length - 1].end_time,
        employee: firstBooking.employee,
        services: packageBookings
      });
    });

    return result;
  };

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all services first
        const { data: servicesData } = await supabase
          .from('services')
          .select('*');
        
        if (servicesData) {
          setServices(servicesData);
        }
        
        // Fetch all packages
        const { data: packagesData } = await supabase
          .from('packages')
          .select(`
            *,
            package_services (
              service_id,
              package_selling_price,
              service:services (
                id,
                name,
                selling_price,
                duration
              )
            )
          `);
        
        if (packagesData) {
          setPackages(packagesData);
        }

        // Fetch the appointment with its bookings
        const { data, error } = await supabase
          .from("appointments")
          .select(`
            *,
            customer:profiles!appointments_customer_id_fkey(*),
            bookings (
              *,
              service:services(*),
              package:packages(*),
              employee:employees!bookings_employee_id_fkey(*)
            )
          `)
          .eq("id", appointmentId)
          .single();

        if (error) throw error;
        setAppointment(data);
      } catch (error) {
        console.error("Error fetching appointment:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (appointmentId) {
      fetchAppointment();
    }
  }, [appointmentId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex justify-center items-center py-8">
        <p>Appointment not found</p>
      </div>
    );
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
  const groupedBookings = groupBookingsByPackage(appointment.bookings);
  
  // Calculate totals
  const subtotal = appointment.original_total_price || appointment.total_price || 0;
  const total = appointment.total_price || 0;
  const discountAmount = subtotal - total;
  const hasDiscount = appointment.discount_type !== 'none' && discountAmount > 0;

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Customer</h3>
          <div className="flex items-center">
            <User className="h-5 w-5 mr-2 text-muted-foreground" />
            <span>{appointment.customer?.full_name}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {appointment.customer?.email && <div>{appointment.customer.email}</div>}
            {appointment.customer?.phone_number && <div>{appointment.customer.phone_number}</div>}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Date & Time</h3>
          <div className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
            <span>
              {format(new Date(appointment.start_time), "EEEE d MMMM, yyyy")} at{" "}
              {format(new Date(appointment.start_time), "h:mm a")} -{" "}
              {format(new Date(appointment.end_time), "h:mm a")}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            Duration: {formatDuration(appointment.total_duration)}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Services</h3>
          
          {/* Individual Services */}
          {groupedBookings.services.map((booking) => (
            <div key={booking.id} className="flex justify-between items-start py-3 border-b last:border-0">
              <div className="space-y-1">
                <p className="font-medium">{booking.service?.name}</p>
                <div className="text-sm text-muted-foreground flex flex-col gap-1">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>
                      {format(new Date(booking.start_time), "h:mm a")} - {format(new Date(booking.end_time), "h:mm a")}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    <span>{booking.employee?.name}</span>
                  </div>
                </div>
              </div>
              <div className="font-medium">
                ₹{booking.price_paid}
              </div>
            </div>
          ))}
          
          {/* Packages */}
          {groupedBookings.packages.map((packageGroup) => (
            <div key={packageGroup.id} className="space-y-2 py-3 border-b last:border-0">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{packageGroup.name}</p>
                  <div className="text-sm text-muted-foreground flex flex-col gap-1">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>
                        {format(new Date(packageGroup.start_time), "h:mm a")} - {format(new Date(packageGroup.end_time), "h:mm a")}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      <span>{packageGroup.employee?.name}</span>
                    </div>
                  </div>
                </div>
                <div className="font-semibold">
                  ₹{packageGroup.package?.price}
                </div>
              </div>
              
              {/* Package Services */}
              <div className="ml-6 space-y-2 border-l-2 border-gray-200 pl-4">
                {packageGroup.services.map((booking) => {
                  // Get the package service entry to check for package_selling_price
                  const packageServiceEntry = packageGroup.package?.package_services?.find(
                    (ps: any) => ps.service.id === booking.service_id
                  );
                  
                  // Get the correct price
                  const servicePrice = getServicePriceInPackage(
                    packageServiceEntry,
                    booking.service?.selling_price || 0
                  );
                  
                  return (
                    <div key={booking.id} className="flex justify-between items-center py-1">
                      <div>
                        <p className="text-sm font-medium">{booking.service?.name}</p>
                        <div className="text-xs text-muted-foreground">
                          {formatDuration(booking.service?.duration || 0)}
                          {booking.employee?.name && booking.employee?.name !== packageGroup.employee?.name && (
                            <span> • {booking.employee?.name}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm">
                        ₹{servicePrice}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>₹{subtotal}</span>
          </div>
          
          {hasDiscount && (
            <div className="flex justify-between text-sm text-green-600">
              <span className="flex items-center">
                <Percent className="mr-1 h-4 w-4" />
                Discount
                {appointment.discount_type === "percentage" && 
                 ` (${appointment.discount_value}%)`}
              </span>
              <span>-₹{discountAmount}</span>
            </div>
          )}
          
          <div className="flex justify-between text-lg font-bold pt-2">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
          
          <div className="text-sm text-muted-foreground pt-2">
            <span className="capitalize">
              Payment Method: {appointment.payment_method}
            </span>
          </div>
          
          {appointment.notes && (
            <div className="pt-4">
              <h4 className="text-sm font-medium">Notes</h4>
              <p className="text-sm text-muted-foreground">{appointment.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
