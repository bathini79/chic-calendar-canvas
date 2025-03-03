import React from 'react';
import { format } from 'date-fns';
import { Clock, User } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ServiceSelectorProps {
  items: any[];
  selectedTimeSlots: Record<string, string>;
  selectedStylists: Record<string, string>;
  onSelectStylist: (itemId: string, stylistId: string) => void;
  onSelectTime: (itemId: string, time: string) => void;
  availableTimes: string[];
  selectedDate: Date | null;
}

export function ServiceSelector({
  items,
  selectedTimeSlots,
  selectedStylists,
  onSelectStylist,
  onSelectTime,
  availableTimes,
  selectedDate
}: ServiceSelectorProps) {
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'active');
      
      if (error) {
        throw error;
      }
      
      return data || [];
    }
  });

  if (!items.length) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No services selected. Please add services to your cart.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const isService = !!item.service_id;
        const isPackage = !!item.package_id;
        const serviceDetails = item.service;
        const packageDetails = item.package as any;
        
        // For packages, we need to create a booking for each service
        const bookings = [];
        
        if (isService) {
          // For individual services, create a single booking
          bookings.push({
            cartItemId: item.id,
            serviceId: item.service_id,
            serviceName: serviceDetails?.name,
            duration: serviceDetails?.duration || 0,
            price: serviceDetails?.selling_price || 0
          });
        } else if (isPackage) {
          // For packages, create a booking for each service in the package
          if (packageDetails?.package_services && packageDetails.package_services.length > 0) {
            packageDetails.package_services.forEach((ps: any) => {
              if (ps.service) {
                bookings.push({
                  cartItemId: item.id,
                  serviceId: ps.service.id,
                  serviceName: ps.service.name,
                  duration: ps.service.duration || 0,
                  price: ps.service.selling_price || 0,
                  packageId: item.package_id
                });
              }
            });
          }
          
          // Add customized services if any
          if (item.customized_services && item.customized_services.length > 0) {
            // We need to fetch these services
            // For now, just add placeholders - in a real app you'd fetch these
            item.customized_services.forEach((serviceId: string) => {
              // Check if this service is not already in the package
              const isInPackage = packageDetails?.package_services?.some(
                (ps: any) => ps.service.id === serviceId
              );
              
              if (!isInPackage) {
                // Find the service in the complete list
                const customService = packageDetails?.package_services?.find(
                  (ps: any) => ps.service.id === serviceId
                )?.service;
                
                if (customService) {
                  bookings.push({
                    cartItemId: item.id,
                    serviceId: customService.id,
                    serviceName: customService.name,
                    duration: customService.duration || 0,
                    price: customService.selling_price || 0,
                    packageId: item.package_id,
                    isCustomized: true
                  });
                }
              }
            });
          }
        }
        
        return (
          <Card key={item.id} className="overflow-hidden">
            <CardHeader className="bg-muted/50 pb-2">
              <CardTitle className="text-lg">
                {isService ? serviceDetails?.name : packageDetails?.name}
              </CardTitle>
              {isPackage && (
                <p className="text-sm text-muted-foreground">
                  {packageDetails?.package_services?.length || 0} services included
                </p>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              {bookings.map((booking, index) => (
                <div 
                  key={`${booking.serviceId}-${index}`}
                  className={`py-2 ${index > 0 ? 'border-t' : ''}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium">{booking.serviceName}</h4>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{booking.duration} min</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">₹{booking.price}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Select Time
                      </label>
                      <Select
                        value={selectedTimeSlots[booking.cartItemId] || ''}
                        onValueChange={(value) => onSelectTime(booking.cartItemId, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTimes.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Select Stylist
                      </label>
                      <Select
                        value={selectedStylists[booking.cartItemId] || ''}
                        onValueChange={(value) => onSelectStylist((booking as any).cartItemId, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Any available stylist" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any available stylist</SelectItem>
                          {employees?.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {employee.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                {employee.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
