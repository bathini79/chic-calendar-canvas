import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, ChevronDown, ChevronUp, Clock, Package, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/CartContext";
import { format, addDays } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface Service {
  id: string;
  name: string;
  duration: number;
  selling_price: number;
}

interface PackageService {
  service: Service;
  package_selling_price?: number;
}

interface Package {
  id: string;
  name: string;
  package_services: PackageService[];
  duration: number;
  price: number;
}

interface CartItem {
  id: string;
  service_id?: string;
  package_id?: string;
  service?: Service;
  package?: Package;
  customized_services?: string[];
  selling_price: number;
}

interface Employee {
  id: string;
  name: string;
  services: string[];
}

interface StylistAvailability {
  id: string;
  name: string;
  isAvailable: boolean;
  hasShiftToday: boolean; 
  onTimeOff: boolean;
  hasBookingConflict: boolean;
}

interface ServiceSelectorProps {
  items: CartItem[];
  selectedStylists: Record<string, string>;
  onStylistSelect: (serviceId: string, stylistId: string) => void;
}

export function ServiceSelector({ items, selectedStylists, onStylistSelect }: ServiceSelectorProps) {
  const [expandedPackages, setExpandedPackages] = useState<Record<string, boolean>>({});
  const [expandedIndividualServices, setExpandedIndividualServices] = useState(false);
  const { selectedLocation, selectedDate, selectedTimeSlots } = useCart();
  const [stylistAvailability, setStylistAvailability] = useState<Record<string, StylistAvailability[]>>({});
  const [dateSelected, setDateSelected] = useState<boolean>(false);

  useEffect(() => {
    setDateSelected(!!selectedDate);
  }, [selectedDate]);

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*');
      
      if (error) throw error;
      return data;
    },
    enabled: items.some(item => item.customized_services?.length > 0)
  });

  const serviceIds = React.useMemo(() => {
    const ids: string[] = [];
    items.forEach(item => {
      if (item.service_id) {
        ids.push(item.service_id);
      }
      
      if (item.package?.package_services) {
        item.package.package_services.forEach(ps => {
          if (ps.service && ps.service.id) {
            ids.push(ps.service.id);
          }
        });
      }
      
      if (item.customized_services?.length) {
        ids.push(...item.customized_services);
      }
    });
    return [...new Set(ids)];
  }, [items]);

  const serviceTimeSlots = React.useMemo(() => {
    const result: { serviceId: string, timeSlot: string }[] = [];
    
    for (const serviceId of serviceIds) {
      const timeSlot = selectedTimeSlots[serviceId];
      if (timeSlot) {
        result.push({ serviceId, timeSlot });
      }
    }
    
    return result;
  }, [serviceIds, selectedTimeSlots]);

  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees-for-services', selectedLocation, serviceIds],
    queryFn: async () => {
      if (serviceIds.length === 0 || !selectedLocation) {
        return [];
      }
      
      const { data: locationEmployees, error: locationError } = await supabase
        .from('employees')
        .select(`
          *,
          employee_locations!inner(location_id)
        `)
        .eq('employment_type', 'stylist')
        .eq('status', 'active')
        .eq('employee_locations.location_id', selectedLocation);
        
      if (locationError) throw locationError;
      if (!locationEmployees?.length) return [];
      
      const employeeIds = locationEmployees.map(emp => emp.id);
      
      const { data: skillsData, error: skillsError } = await supabase
        .from('employee_skills')
        .select('employee_id, service_id')
        .in('employee_id', employeeIds)
        .in('service_id', serviceIds);
        
      if (skillsError) throw skillsError;
      
      const employeeServiceMap: Record<string, string[]> = {};
      
      skillsData?.forEach(skill => {
        if (!employeeServiceMap[skill.employee_id]) {
          employeeServiceMap[skill.employee_id] = [];
        }
        employeeServiceMap[skill.employee_id].push(skill.service_id);
      });
      
      return locationEmployees.map(emp => ({
        ...emp,
        services: employeeServiceMap[emp.id] || []
      }));
    },
    enabled: !!selectedLocation && serviceIds.length > 0
  });

  const { data: regularShifts, isLoading: isLoadingShifts } = useQuery({
    queryKey: ['regular-shifts', selectedLocation, selectedDate],
    queryFn: async () => {
      if (!selectedLocation || !selectedDate) return [];
      
      const dayOfWeek = selectedDate.getDay();
      
      const { data, error } = await supabase
        .from('recurring_shifts')
        .select('*')
        .eq('location_id', selectedLocation)
        .eq('day_of_week', dayOfWeek);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedLocation && !!selectedDate
  });

  const { data: timeOffRequests, isLoading: isLoadingTimeOff } = useQuery({
    queryKey: ['time-off-requests', selectedDate],
    queryFn: async () => {
      if (!selectedDate) return [];
      
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('time_off_requests')
        .select('*')
        .eq('status', 'approved')
        .lte('start_date', dateStr)
        .gte('end_date', dateStr);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedDate
  });

  const { data: existingBookings, isLoading: isLoadingBookings } = useQuery({
    queryKey: ['bookings', selectedDate, selectedLocation],
    queryFn: async () => {
      if (!selectedDate || !selectedLocation) return [];
      
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('bookings')
        .select('*, employee:employees(*), appointment:appointments(*)')
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .eq('appointments.location', selectedLocation);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedDate && !!selectedLocation
  });

  const workingStylists = React.useMemo(() => {
    if (!regularShifts) return new Set<string>();
    
    const stylistIds = new Set<string>();
    regularShifts.forEach(shift => {
      stylistIds.add(shift.employee_id);
    });
    return stylistIds;
  }, [regularShifts]);

  const stylistsOnTimeOff = React.useMemo(() => {
    if (!timeOffRequests) return new Set<string>();
    
    const stylistIds = new Set<string>();
    timeOffRequests.forEach(timeOff => {
      stylistIds.add(timeOff.employee_id);
    });
    return stylistIds;
  }, [timeOffRequests]);
  
  useEffect(() => {
    if (!employees || !selectedDate) return;
    
    const availabilityMap: Record<string, StylistAvailability[]> = {};
    
    for (const serviceId of serviceIds) {
      const serviceEmployees = employees.filter(emp => 
        emp.services.includes(serviceId) || emp.services.length === 0
      );
      
      const availableStylistsForService: StylistAvailability[] = serviceEmployees.map(employee => {
        const onTimeOff = stylistsOnTimeOff.has(employee.id);
        const hasShiftToday = workingStylists.has(employee.id);
        const hasBookingConflict = false;
        const isAvailable = hasShiftToday && !onTimeOff;
        
        return {
          id: employee.id,
          name: employee.name,
          isAvailable,
          hasShiftToday,
          onTimeOff,
          hasBookingConflict
        };
      });
      
      availabilityMap[serviceId] = availableStylistsForService;
    }
    
    for (const { serviceId, timeSlot } of serviceTimeSlots) {
      if (!availabilityMap[serviceId]) continue;
      
      availabilityMap[serviceId] = availabilityMap[serviceId].map(stylistAvail => {
        if (!stylistAvail.isAvailable) return stylistAvail;
        
        const [hours, minutes] = timeSlot.split(':').map(Number);
        
        const appointmentStart = new Date(selectedDate);
        appointmentStart.setHours(hours, minutes, 0, 0);
        
        const service = items.find(item => item.service_id === serviceId)?.service;
        const packageService = items.find(item => {
          return item.package?.package_services?.some(
            (ps: any) => ps.service.id === serviceId
          );
        })?.package?.package_services?.find(
          (ps: any) => ps.service.id === serviceId
        );
        
        const duration = service?.duration || packageService?.service?.duration || 60;
        const appointmentEnd = new Date(appointmentStart.getTime() + duration * 60 * 1000);
        
        let withinShift = false;
        const stylistShifts = regularShifts?.filter(
          shift => shift.employee_id === stylistAvail.id
        ) || [];
        
        if (stylistShifts.length > 0) {
          withinShift = stylistShifts.some(shift => {
            const shiftStart = new Date(selectedDate);
            const shiftEnd = new Date(selectedDate);
            
            const [startHour, startMinute] = shift.start_time.split(':').map(Number);
            const [endHour, endMinute] = shift.end_time.split(':').map(Number);
            
            shiftStart.setHours(startHour, startMinute, 0, 0);
            shiftEnd.setHours(endHour, endMinute, 0, 0);
            
            return appointmentStart >= shiftStart && appointmentEnd <= shiftEnd;
          });
        }
        
        if (!withinShift) {
          return {
            ...stylistAvail,
            isAvailable: false,
            hasBookingConflict: false
          };
        }
        
        const hasConflict = existingBookings?.some(booking => {
          if (booking.employee_id !== stylistAvail.id) return false;
          
          const bookingStart = new Date(booking.start_time);
          const bookingEnd = new Date(booking.end_time);
          
          return (appointmentStart < bookingEnd && appointmentEnd > bookingStart);
        }) || false;
        
        return {
          ...stylistAvail,
          isAvailable: !hasConflict && withinShift,
          hasBookingConflict: hasConflict
        };
      });
    }
    
    setStylistAvailability(availabilityMap);
  }, [
    employees,
    selectedDate,
    serviceTimeSlots,
    workingStylists,
    stylistsOnTimeOff,
    existingBookings,
    items,
    serviceIds,
    regularShifts
  ]);

  const groupedItems = items.reduce((acc: any, item) => {
    if (item.package_id && item.package) {
      const packageServices: PackageService[] = [];
      
      if (item.package.package_services) {
        packageServices.push(...item.package.package_services);
      }
      
      if (item.customized_services?.length && services) {
        const customizedServiceObjects = item.customized_services
          .map(serviceId => {
            const service = services.find(s => s.id === serviceId);
            return service ? { service } : null;
          })
          .filter(Boolean) as PackageService[];
        
        packageServices.push(...customizedServiceObjects);
      }

      acc.packages[item.package_id] = {
        package: item.package,
        cartItemId: item.id,
        services: packageServices
      };
    } else if (item.service) {
      acc.services.push({
        cartItemId: item.id,
        service: item.service
      });
    }
    return acc;
  }, { 
    packages: {} as Record<string, {
      package: Package;
      cartItemId: string;
      services: PackageService[];
    }>, 
    services: [] as Array<{
      cartItemId: string;
      service: Service;
    }> 
  });

  const togglePackageExpansion = (packageId: string) => {
    setExpandedPackages(prev => ({
      ...prev,
      [packageId]: !prev[packageId]
    }));
  };

  const toggleIndividualServicesExpansion = () => {
    setExpandedIndividualServices(!expandedIndividualServices);
  };

  const getServicePrice = (service: Service, packageService?: PackageService): number => {
    if (packageService && packageService.package_selling_price !== undefined && packageService.package_selling_price !== null) {
      return packageService.package_selling_price;
    }
    return service.selling_price;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ""}`;
    }
    return `${remainingMinutes}m`;
  };

  const getEmployeesForService = (serviceId: string) => {
    if (!employees || !serviceId) return [];
    
    if (!selectedDate) {
      return employees.filter(emp => 
        emp.services.includes(serviceId) || emp.services.length === 0
      );
    }
    
    return employees.filter(emp => {
      const canPerformService = emp.services.includes(serviceId) || emp.services.length === 0;
      if (!canPerformService) return false;
      
      if (!selectedTimeSlots[serviceId]) {
        return workingStylists.has(emp.id) && !stylistsOnTimeOff.has(emp.id);
      }
      
      const availability = stylistAvailability[serviceId]?.find(a => a.id === emp.id);
      
      if (!availability) {
        return workingStylists.has(emp.id) && !stylistsOnTimeOff.has(emp.id);
      }
      
      return availability.isAvailable;
    });
  };

  const getStylistAvailabilityStatus = (serviceId: string, stylistId: string): {
    isAvailable: boolean;
    reason?: string;
  } => {
    if (!selectedDate) {
      return { isAvailable: true };
    }
    
    if (!workingStylists.has(stylistId)) {
      return { isAvailable: false, reason: "Stylist is not working on this day" };
    }
    
    if (stylistsOnTimeOff.has(stylistId)) {
      return { isAvailable: false, reason: "Stylist is on time off" };
    }
    
    if (!selectedTimeSlots[serviceId]) {
      return { isAvailable: true };
    }
    
    const availabilityList = stylistAvailability[serviceId] || [];
    const stylistAvail = availabilityList.find(a => a.id === stylistId);
    
    if (!stylistAvail) {
      return { isAvailable: true };
    }
    
    if (!stylistAvail.isAvailable) {
      if (stylistAvail.hasBookingConflict) {
        return { isAvailable: false, reason: "Stylist has another booking at this time" };
      } else {
        return { isAvailable: false, reason: "Stylist is not scheduled to work at this time" };
      }
    }
    
    return { isAvailable: true };
  };

  const anyAvailableForService = (serviceId: string): boolean => {
    if (!selectedDate) return true;
    
    const serviceEmployees = employees?.filter(emp => 
      emp.services.includes(serviceId) || emp.services.length === 0
    ) || [];
    
    return serviceEmployees.some(emp => {
      const status = getStylistAvailabilityStatus(serviceId, emp.id);
      return status.isAvailable;
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Select Stylists</CardTitle>
        {!selectedDate && (
          <div className="mt-2 flex items-center gap-2 text-sm p-2 bg-amber-50 text-amber-800 rounded-md">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p>Please select a date and time to see available stylists</p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedItems.packages).map(([packageId, packageData]) => (
          <div key={packageId} className="space-y-4">
            <Button 
              variant="ghost" 
              className="w-full justify-between p-2 h-auto" 
              onClick={() => togglePackageExpansion(packageId)}
            >
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col items-start">
                  <span className="font-semibold">{packageData.package.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {packageData.services.length} services • {formatDuration(packageData.package.duration || 0)}
                  </span>
                </div>
              </div>
              {expandedPackages[packageId] ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            
            {expandedPackages[packageId] && (
              <div className="space-y-3 pl-4">
                {packageData.services.map((ps: PackageService) => {
                  const isPackageService = packageData.package.package_services.some(
                    basePs => basePs.service.id === ps.service.id
                  );
                  
                  const basePackageService = isPackageService 
                    ? packageData.package.package_services.find(basePs => basePs.service.id === ps.service.id)
                    : undefined;
                  
                  const displayPrice = getServicePrice(ps.service, basePackageService);
                  
                  const availableEmployees = getEmployeesForService(ps.service.id);
                  const hasAvailableStylist = anyAvailableForService(ps.service.id);
                  
                  return (
                    <div 
                      key={`${packageData.cartItemId}-${ps.service.id}`}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{ps.service.name}</p>
                          {selectedDate && !hasAvailableStylist && (
                            <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200">
                              No stylists available
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDuration(ps.service.duration)} • ₹{displayPrice}
                        </p>
                      </div>
                      <TooltipProvider>
                        <Select 
                          value={selectedStylists[ps.service.id] || ''} 
                          onValueChange={(value) => onStylistSelect(ps.service.id, value)}
                        >
                          <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue placeholder="Select stylist" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any Available Stylist</SelectItem>
                            {employees?.filter(emp => 
                              emp.services.includes(ps.service.id) || 
                              emp.services.length === 0
                            ).map((employee) => {
                              const availability = getStylistAvailabilityStatus(ps.service.id, employee.id);
                              const isUnavailable = selectedDate && !availability.isAvailable;
                              
                              return (
                                <Tooltip key={employee.id}>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <SelectItem 
                                        value={employee.id} 
                                        disabled={isUnavailable}
                                        className={isUnavailable ? "opacity-50" : ""}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span>{employee.name}</span>
                                          {isUnavailable && (
                                            <Clock className="h-3 w-3 text-amber-500" />
                                          )}
                                        </div>
                                      </SelectItem>
                                    </div>
                                  </TooltipTrigger>
                                  {isUnavailable && (
                                    <TooltipContent>
                                      <p className="text-xs">{availability.reason}</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </TooltipProvider>
                    </div>
                  );
                })}
              </div>
            )}
            <Separator className="my-4" />
          </div>
        ))}

        {groupedItems.services.length > 0 && (
          <div className="space-y-4">
            <Button 
              variant="ghost" 
              className="w-full justify-between p-2 h-auto" 
              onClick={toggleIndividualServicesExpansion}
            >
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col items-start">
                  <span className="font-semibold">Individual Services</span>
                  <span className="text-xs text-muted-foreground">
                    {groupedItems.services.length} services
                  </span>
                </div>
              </div>
              {expandedIndividualServices ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            
            {expandedIndividualServices && (
              <div className="space-y-3 pl-4">
                {groupedItems.services.map(({ cartItemId, service }) => {
                  const availableEmployees = getEmployeesForService(service.id);
                  const hasAvailableStylist = anyAvailableForService(service.id);
                  
                  return (
                    <div 
                      key={cartItemId}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{service.name}</p>
                          {selectedDate && !hasAvailableStylist && (
                            <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200">
                              No stylists available
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDuration(service.duration)} • ₹{service.selling_price}
                        </p>
                      </div>
                      <TooltipProvider>
                        <Select 
                          value={selectedStylists[service.id] || ''} 
                          onValueChange={(value) => onStylistSelect(service.id, value)}
                        >
                          <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue placeholder="Select stylist" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any Available Stylist</SelectItem>
                            {employees?.filter(emp => 
                              emp.services.includes(service.id) || 
                              emp.services.length === 0
                            ).map((employee) => {
                              const availability = getStylistAvailabilityStatus(service.id, employee.id);
                              const isUnavailable = selectedDate && !availability.isAvailable;
                              
                              return (
                                <Tooltip key={employee.id}>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <SelectItem 
                                        value={employee.id} 
                                        disabled={isUnavailable}
                                        className={isUnavailable ? "opacity-50" : ""}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span>{employee.name}</span>
                                          {isUnavailable && (
                                            <Clock className="h-3 w-3 text-amber-500" />
                                          )}
                                        </div>
                                      </SelectItem>
                                    </div>
                                  </TooltipTrigger>
                                  {isUnavailable && (
                                    <TooltipContent>
                                      <p className="text-xs">{availability.reason}</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </TooltipProvider>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        
        {isLoadingEmployees || isLoadingShifts || isLoadingTimeOff || isLoadingBookings ? (
          <div className="text-center py-2 text-sm text-muted-foreground">
            Loading stylist availability...
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
