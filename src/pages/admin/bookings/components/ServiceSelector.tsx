import React from 'react';
import { useState, useEffect } from "react";
import { Package as PackageIcon, Plus, Minus, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CategoryFilter } from "@/components/customer/services/CategoryFilter";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useStaffAvailability } from "../hooks/useStaffAvailability";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

type Stylist = {
  id: string;
  name: string;
  employment_type: 'stylist';
  status: 'active';
};

export interface ServiceSelectorProps {
  onServiceSelect?: (serviceId: string) => void;
  onPackageSelect?: (packageId: string, serviceIds?: string[]) => void;
  onStylistSelect: (itemId: string, stylistId: string) => void;
  selectedServices: string[];
  selectedPackages: string[];
  selectedStylists: Record<string, string>;
  stylists: Stylist[];
  onCustomPackage?: (packageId: string, serviceId: string) => void;
  customizedServices?: Record<string, string[]>;
  locationId?: string;
  selectedDate?: Date;
  selectedTime?: string;
  existingAppointment?: boolean;
  appointmentId?: string; // Add this parameter to identify the current appointment being edited
}

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  onServiceSelect,
  onPackageSelect,
  onStylistSelect,
  selectedServices,
  selectedPackages,
  selectedStylists,
  stylists,
  onCustomPackage,
  customizedServices = {},
  locationId,
  selectedDate,
  selectedTime,
  existingAppointment = false,
  appointmentId
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedPackages, setExpandedPackages] = useState<string[]>([]);
  const [bookedStylistWarnings, setBookedStylistWarnings] = useState<Record<string, {message: string, status: string}>>({});
  
  // Get staff availability when appointment time is selected
  const { availableStylistsInfo, availableStylists, isLoading: isLoadingAvailability } = useStaffAvailability({
    selectedDate,
    selectedTime,
    locationId,
    appointmentId, // Pass the appointmentId to useStaffAvailability
  });

  // Query to fetch employee skills (which service each stylist can perform)
  const { data: employeeSkills } = useQuery({
    queryKey: ['employee-skills', locationId],
    queryFn: async () => {
      // Get all employees with the perform_services permission first
      const { data: employees, error: employeeError } = await supabase
        .from('employees')
        .select(`
          id,
          employment_types!inner(permissions)
        `)
        .eq('status', 'active');
      
      if (employeeError) throw employeeError;
      
      // Filter to employees with the perform_services permission
      const staffWithPermission = employees?.filter(employee => {
        const permissions = employee.employment_types?.permissions || [];
        return Array.isArray(permissions) && permissions.includes('perform_services');
      }) || [];
      
      const staffIds = staffWithPermission.map(emp => emp.id);
      
      // Then get their skills
      const { data, error } = await supabase
        .from('employee_skills')
        .select(`
          employee_id,
          service_id
        `)
        .in('employee_id', staffIds);
      
      if (error) throw error;
      return data;
    },
  });

  // Create a map of service_id to qualified stylists
  const serviceToStylistsMap = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    
    if (employeeSkills) {
      employeeSkills.forEach(skill => {
        if (!map[skill.service_id]) {
          map[skill.service_id] = [];
        }
        map[skill.service_id].push(skill.employee_id);
      });
    }
    
    return map;
  }, [employeeSkills]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: services } = useQuery({
    queryKey: ['services', locationId],
    queryFn: async () => {
      let query = supabase
        .from('services')
        .select(`
          *,
          services_categories!inner(
            categories(id, name)
          )
        `)
        .eq('status', 'active');
      
      if (locationId) {
        // Get services associated with this location
        const { data: serviceLocations, error: serviceLocationsError } = await supabase
          .from('service_locations')
          .select('service_id')
          .eq('location_id', locationId);
        
        if (serviceLocationsError) throw serviceLocationsError;
        
        // If we have service locations, filter by them
        if (serviceLocations && serviceLocations.length > 0) {
          const serviceIds = serviceLocations.map(sl => sl.service_id);
          query = query.in('id', serviceIds);
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

  const { data: packages } = useQuery({
    queryKey: ['packages', locationId],
    queryFn: async () => {
      let query = supabase
        .from('packages')
        .select(`
          *,
          package_services(
            service:services(*),
            package_selling_price
          )
        `)
        .eq('status', 'active');

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });

  const filteredServices = selectedCategory
    ? services?.filter(service => 
        service.services_categories.some(sc => sc.categories.id === selectedCategory)
      )
    : services;

  const filteredPackages = selectedCategory
    ? packages?.filter(pkg => 
        pkg.package_services.some(ps => 
          services?.find(s => s.id === ps.service.id)?.services_categories.some(
            sc => sc.categories.id === selectedCategory
          )
        )
      )
    : packages;

  const allItems = [
    ...(filteredPackages || []).map(pkg => ({
      type: 'package' as const,
      ...pkg
    })),
    ...(filteredServices || []).map(service => ({
      type: 'service' as const,
      ...service
    }))
  ];

  const calculatePackagePrice = (pkg: any) => {
    const basePrice = pkg.price || 0;
    const customServices = customizedServices[pkg.id] || [];
    const additionalPrice = customServices.reduce((sum, serviceId) => {
      const service = services?.find(s => s.id === serviceId);
      return sum + (service?.selling_price || 0);
    }, 0);
    return basePrice + additionalPrice;
  };

  // Function to determine if a stylist is available
  const isStylistAvailable = (stylistId: string) => {
    if (!selectedDate || !selectedTime) return true;
    if (!availableStylistsInfo) return availableStylists.includes(stylistId);
    
    const stylistInfo = availableStylistsInfo.find(s => s.id === stylistId);

    // If stylist is unavailable due to a booking conflict, check its status
    if (!stylistInfo?.isAvailable && stylistInfo?.bookingInfo) {
      const status = stylistInfo.bookingInfo.status;
      // Only consider "booked" or "inprogress" as conflicts
      if (status !== "booked" && status !== "inprogress" && status !== "confirmed") {
        return true; // Treat as available if not booked or in progress
      }
    }
    
    return stylistInfo?.isAvailable ?? true;
  };

  // Get the booking info for a stylist if they're unavailable
  const getStylistBookingInfo = (stylistId: string) => {
    if (!availableStylistsInfo) return null;
    const stylistInfo = availableStylistsInfo.find(s => s.id === stylistId);
    
    // Only return booking info if status is "booked" or "inprogress"
    if (stylistInfo?.bookingInfo) {
      const status = stylistInfo.bookingInfo.status;
      if (status === "booked" || status === "inprogress" || status === "confirmed") {
        return stylistInfo.bookingInfo;
      }
    }
    
    return null;
  };

  // Check if this stylist is only booked for this current appointment
  const isBookedForCurrentAppointmentOnly = (stylistId: string, bookingInfo: any) => {
    if (!existingAppointment || !bookingInfo) return false;
    
    // If the appointment ID matches the current appointment's ID, this is not a conflict
    // This would need to be implemented based on your actual appointment ID structure
    return false; // Placeholder - implement the actual logic
  };

  // Handle stylist selection
  const handleStylistSelection = (itemId: string, stylistId: string) => {
    // If stylist is "any" or available, no warnings needed
    if (stylistId === 'any' || isStylistAvailable(stylistId)) {
      // Clear any existing warning for this item
      if (bookedStylistWarnings[itemId]) {
        const newWarnings = { ...bookedStylistWarnings };
        delete newWarnings[itemId];
        setBookedStylistWarnings(newWarnings);
      }
      onStylistSelect(itemId, stylistId);
      return;
    }

    // Get booking info for unavailable stylist
    const bookingInfo = getStylistBookingInfo(stylistId);
    
    // If this is the stylist's own booking for this appointment, don't warn
    if (isBookedForCurrentAppointmentOnly(stylistId, bookingInfo)) {
      onStylistSelect(itemId, stylistId);
      return;
    }

    // Get stylist name
    const stylistName = stylists.find(s => s.id === stylistId)?.name || 'Stylist';
    
    // Format times for the warning message
    const startTime = bookingInfo?.startTime ? 
      new Date(bookingInfo.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
    const endTime = bookingInfo?.endTime ? 
      new Date(bookingInfo.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
    
    // Create warning message with booking details
    setBookedStylistWarnings(prev => ({
      ...prev,
      [itemId]: {
        message: `${stylistName} is already booked from ${startTime} to ${endTime}. They may have overlapping appointments.`,
        status: bookingInfo?.status || 'booked'
      }
    }));

    // Still allow selection but show a toast warning
    toast.warning(`${stylistName} already has a booking during this time slot.`);
    onStylistSelect(itemId, stylistId);
  };

  const handlePackageSelect = (pkg: any) => {
    // Extract base service IDs from the package
    const baseServices = pkg?.package_services.map((ps: any) => ps.service.id);
    const currentCustomServices = customizedServices[pkg.id] || [];

    if (selectedPackages.includes(pkg.id)) {
      // If already selected, deselect the package
      onPackageSelect(pkg.id);
      setExpandedPackages(prev => prev.filter(id => id !== pkg.id));
    } else {
      // Expand the package view even if not selecting yet
      setExpandedPackages(prev => [...prev, pkg.id]);
      // Select the package and provide all service IDs (base + custom)
      onPackageSelect(pkg.id, [...baseServices, ...currentCustomServices]);
    }
  };

  // Get the price of a service within a package
  const getServicePriceInPackage = (packageId: string, serviceId: string) => {
    const pkg = packages?.find(p => p.id === packageId);
    if (!pkg) return 0;

    const packageService = pkg.package_services?.find(ps => ps.service.id === serviceId);
    if (packageService) {
      // Use package_selling_price if available, otherwise fall back to the service's selling_price
      return packageService.package_selling_price !== null && packageService.package_selling_price !== undefined
        ? packageService.package_selling_price
        : packageService.service.selling_price;
    }

    // For customized services not in the base package
    const service = services?.find(s => s.id === serviceId);
    return service?.selling_price || 0;
  };

  // Function to get service duration for availability calculations
  const getServiceDuration = (serviceId: string): number => {
    const service = services?.find(s => s.id === serviceId);
    return service?.duration || 60; // Default to 60 minutes if not found
  };

  // Function to check if a stylist can perform a specific service
  const canStylistPerformService = (stylistId: string, serviceId: string): boolean => {
    // "Any" option can perform any service
    if (stylistId === 'any') return true;
    
    // If we have no service-to-stylists map or no service ID, allow all stylists
    if (!serviceToStylistsMap || !serviceId) return true;
    
    // Get stylists who can perform this service
    const qualifiedStylists = serviceToStylistsMap[serviceId] || [];
    
    // If no specific stylists are assigned to this service, all can perform it
    if (qualifiedStylists.length === 0) return true;
    
    // Otherwise, check if this stylist is in the qualified list
    return qualifiedStylists.includes(stylistId);
  };

  // Function to render the stylist selection dropdown
  const renderStylistDropdown = (itemId: string, value: string, colorIndicator = false) => {
    // Get qualified stylists for this service
    const serviceId = itemId; // In most cases, itemId is the serviceId
    const qualifiedStylistIds = serviceToStylistsMap[serviceId] || [];
    
    // Filter the list of stylists to only include those who can perform this service
    // If no specific stylists are assigned, show all stylists (they all can perform it)
    const filteredStylists = qualifiedStylistIds.length === 0
      ? stylists
      : stylists.filter(stylist => qualifiedStylistIds.includes(stylist.id));

    return (
      <TooltipProvider delayDuration={300}>
        <Select 
          value={value || ''} 
          onValueChange={(value) => handleStylistSelection(itemId, value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select stylist" />
          </SelectTrigger>
          <SelectContent align="center" side="bottom">
            <SelectItem value="any">Any Available Stylist</SelectItem>
            {filteredStylists.map((stylist) => {
              const available = isStylistAvailable(stylist.id);
              
              return (
                <Tooltip key={stylist.id}>
                  <TooltipTrigger asChild>
                    <div>
                      <SelectItem 
                        value={stylist.id}
                        // Allow selection even when not available
                        disabled={false}
                        className={cn(!available && "opacity-70")}
                      >
                        <span className="flex items-center gap-2">
                          {stylist.name}
                          {!available && colorIndicator && (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          )}
                        </span>
                      </SelectItem>
                    </div>
                  </TooltipTrigger>
                  {!available && (
                    <TooltipContent side="right" align="start" className="z-50">
                      <p>This stylist is not available at the selected time</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </SelectContent>
        </Select>
      </TooltipProvider>
    );
  };

  return (
    <div className="space-y-6">
      <CategoryFilter
        categories={categories || []}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />

      <ScrollArea className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="w-[200px]">Stylist</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allItems.map((item) => {
              const isService = item.type === 'service';
              const isPackage = item.type === 'package';
              const isExpanded = isPackage && (selectedPackages.includes(item.id) || expandedPackages.includes(item.id));
              const isSelected = isService 
                ? selectedServices.includes(item.id)
                : isExpanded;

              return (
                <React.Fragment key={`${item.type}-${item.id}`}>
                  <TableRow 
                    className={cn(
                      "transition-colors",
                      isSelected && "bg-red-50 hover:bg-red-100"
                    )}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isPackage && (
                          <div className="flex items-center gap-1">
                            <PackageIcon className="h-4 w-4" />
                            <Badge variant="default">Package</Badge>
                          </div>
                        )}
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isService ? item.duration : 
                        item.package_services?.reduce((sum: number, ps: any) => 
                          sum + (ps.service?.duration || 0), 0)
                      } min
                    </TableCell>
                    <TableCell>
                      ₹{isService ? item.selling_price : calculatePackagePrice(item)}
                    </TableCell>
                    <TableCell>
                      {isService && isSelected && 
                        renderStylistDropdown(item.id, selectedStylists[item.id] || '', true)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (isPackage) {
                            handlePackageSelect(item);
                          } else {
                            onServiceSelect(item.id);
                          }
                        }}
                      >
                        {isSelected ? (
                          <Minus className="h-4 w-4 text-destructive" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isPackage && isExpanded && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-slate-50">
                        <div className="pl-8 pr-4 py-2 space-y-2">
                          {item.package_services?.map((ps: any) => (
                            <div
                              key={ps.service.id}
                              className="flex items-center justify-between py-2 border-b last:border-0"
                            >
                              <div className="flex items-center gap-4">
                                <span className="text-sm font-medium">{ps.service.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  ({ps.service.duration} min)
                                </span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-sm font-medium">
                                  ₹{ps.package_selling_price !== null && ps.package_selling_price !== undefined
                                    ? ps.package_selling_price
                                    : ps.service.selling_price}
                                </span>
                                {renderStylistDropdown(ps.service.id, selectedStylists[ps.service.id] || '')}
                              </div>
                            </div>
                          ))}
                          {item.is_customizable && (
                            <div className="pt-4 space-y-4">
                              <h4 className="font-medium text-sm">Additional Services</h4>
                              {services?.filter(service => 
                                item.customizable_services?.includes(service.id)
                              ).map(service => (
                                <div
                                  key={service.id}
                                  className="flex items-center justify-between py-2"
                                >
                                  <div className="flex items-center gap-4">
                                    <Checkbox
                                      checked={customizedServices[item.id]?.includes(service.id)}
                                      onCheckedChange={() => onCustomPackage && onCustomPackage(item.id, service.id)}
                                    />
                                    <span className="text-sm font-medium">{service.name}</span>
                                    <span className="text-sm text-muted-foreground">
                                      ({service.duration} min)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className="text-sm font-medium">
                                      +₹{service.selling_price}
                                    </span>
                                    {customizedServices[item.id]?.includes(service.id) && 
                                      renderStylistDropdown(service.id, selectedStylists[service.id] || '')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
      
      {isLoadingAvailability && (
        <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
          Loading stylist availability...
        </div>
      )}
      
      {Object.keys(bookedStylistWarnings).length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
          <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
          <div className="text-sm text-yellow-600">
            {Object.values(bookedStylistWarnings).length === 1 ? (
              <span>{Object.values(bookedStylistWarnings)[0].message}</span>
            ) : (
              <span>{Object.values(bookedStylistWarnings).length} stylists have booking conflicts</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
