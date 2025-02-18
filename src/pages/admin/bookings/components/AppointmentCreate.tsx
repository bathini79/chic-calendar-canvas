import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ServiceSelector } from "./ServiceSelector";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface AppointmentCreateProps {
  customerId: string;
  selectedDate?: Date | null;
  selectedTime?: string;
  defaultStylistId?: string;
}

type Stylist = {
  id: string;
  name: string;
  employment_type: 'stylist';
  status: 'active' | 'inactive';
};

export function AppointmentCreate({ 
  customerId, 
  selectedDate, 
  selectedTime,
  defaultStylistId
}: AppointmentCreateProps) {
  const navigate = useNavigate();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [customizedPackageServices, setCustomizedPackageServices] = useState<Record<string, string[]>>({});
  const [selectedStylists, setSelectedStylists] = useState<Record<string, string>>({});
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch active stylists
  const { data: stylists = [], isLoading: isLoadingStylists } = useQuery({
    queryKey: ['active-stylists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, employment_type, status')
        .eq('employment_type', 'stylist')
        .eq('status', 'active')
        .order('name');
      
      if (error) {
        console.error('Error fetching stylists:', error);
        throw error;
      }
      return data as Stylist[];
    },
  });

  // Set default stylist when available
  useEffect(() => {
    if (defaultStylistId && stylists?.some(s => s.id === defaultStylistId)) {
      const newSelectedStylists: Record<string, string> = {};
      [...selectedServices, ...selectedPackages].forEach(itemId => {
        newSelectedStylists[itemId] = defaultStylistId;
      });
      setSelectedStylists(newSelectedStylists);
    }
  }, [defaultStylistId, selectedServices, selectedPackages, stylists]);

  // Fetch services and packages for price calculation
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: packages } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    },
  });

  const calculateTotalPrice = () => {
    let total = 0;
    
    // Add service prices
    selectedServices.forEach(serviceId => {
      const service = services?.find(s => s.id === serviceId);
      if (service) {
        total += service.selling_price;
      }
    });

    // Add package prices
    selectedPackages.forEach(packageId => {
      const pkg = packages?.find(p => p.id === packageId);
      if (pkg) {
        total += pkg.price;
      }
    });

    // Apply discount
    if (discountType === 'percentage') {
      total = total * (1 - (discountValue / 100));
    } else if (discountType === 'fixed') {
      total = Math.max(0, total - discountValue);
    }

    return total;
  };

  const calculateOriginalPrice = () => {
    let total = 0;
    
    selectedServices.forEach(serviceId => {
      const service = services?.find(s => s.id === serviceId);
      if (service) {
        total += service.selling_price;
      }
    });

    selectedPackages.forEach(packageId => {
      const pkg = packages?.find(p => p.id === packageId);
      if (pkg) {
        total += pkg.price;
      }
    });

    return total;
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServices(prev => {
      const updated = prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId];
      
      // Automatically assign the default stylist to newly selected services
      if (!prev.includes(serviceId) && defaultStylistId) {
        setSelectedStylists(prev => ({
          ...prev,
          [serviceId]: defaultStylistId
        }));
      }
      return updated;
    });
  };

  const handlePackageSelect = (packageId: string, services: string[]) => {
    setSelectedPackages(prev => {
      const updated = prev.includes(packageId)
        ? prev.filter(id => id !== packageId)
        : [...prev, packageId];
      
      // Automatically assign the default stylist to newly selected packages
      if (!prev.includes(packageId) && defaultStylistId) {
        setSelectedStylists(prev => ({
          ...prev,
          [packageId]: defaultStylistId
        }));
      }
      return updated;
    });
    
    if (services.length > 0) {
      setCustomizedPackageServices(prev => ({
        ...prev,
        [packageId]: services
      }));
    }
  };

  const handleStylistSelect = (itemId: string, stylistId: string) => {
    setSelectedStylists(prev => ({
      ...prev,
      [itemId]: stylistId
    }));
  };

  const validateStylistSelection = () => {
    const allItems = [...selectedServices, ...selectedPackages];
    return allItems.every(itemId => selectedStylists[itemId]);
  };

  const handleSaveAppointment = async () => {
    try {
      setIsLoading(true);

      if (!selectedDate || !selectedTime) {
        toast.error("Please select a date and time");
        return;
      }

      if (!validateStylistSelection()) {
        toast.error("Please select a stylist for each service/package");
        return;
      }

      // Calculate start_time by combining date and time
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);

      const originalTotalPrice = calculateOriginalPrice();
      const finalTotalPrice = calculateTotalPrice();

      // Create the appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          customer_id: customerId,
          start_time: startTime.toISOString(),
          end_time: startTime.toISOString(), // Will be calculated properly
          status: 'confirmed',
          total_price: finalTotalPrice,
          original_total_price: originalTotalPrice,
          discount_type: discountType,
          discount_value: discountValue,
          notes: notes,
          number_of_bookings: selectedServices.length + selectedPackages.length
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Create bookings for services
      const serviceBookings = selectedServices.map(serviceId => {
        const service = services?.find(s => s.id === serviceId);
        return {
          appointment_id: appointment.id,
          service_id: serviceId,
          employee_id: selectedStylists[serviceId],
          status: 'confirmed',
          price_paid: service?.selling_price || 0,
          original_price: service?.selling_price || 0
        };
      });

      // Create bookings for packages
      const packageBookings = selectedPackages.map(packageId => {
        const pkg = packages?.find(p => p.id === packageId);
        return {
          appointment_id: appointment.id,
          package_id: packageId,
          employee_id: selectedStylists[packageId],
          status: 'confirmed',
          price_paid: pkg?.price || 0,
          original_price: pkg?.price || 0,
          customized_services: customizedPackageServices[packageId] || []
        };
      });

      // Insert all bookings
      const { error: bookingsError } = await supabase
        .from('bookings')
        .insert([...serviceBookings, ...packageBookings]);

      if (bookingsError) throw bookingsError;

      toast.success("Appointment created successfully");
      navigate(`/admin/bookings/${appointment.id}`);
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingStylists) {
    return <div>Loading stylists...</div>;
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create Appointment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ServiceSelector
            onServiceSelect={handleServiceSelect}
            onPackageSelect={handlePackageSelect}
            onStylistSelect={handleStylistSelect}
            selectedServices={selectedServices}
            selectedPackages={selectedPackages}
            selectedStylists={selectedStylists}
            stylists={stylists}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Discount Type</label>
              <Select value={discountType} onValueChange={(value: 'none' | 'percentage' | 'fixed') => setDiscountType(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select discount type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {discountType === 'percentage' ? 'Discount (%)' : 'Discount Amount'}
              </label>
              <Input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                disabled={discountType === 'none'}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special instructions or notes..."
              className="min-h-[100px]"
            />
          </div>

          <div className="rounded-lg bg-muted p-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">Original Total:</span>
              <span>${calculateOriginalPrice().toFixed(2)}</span>
            </div>
            {discountType !== 'none' && (
              <div className="flex justify-between items-center mt-2">
                <span className="font-medium">Discount:</span>
                <span className="text-red-500">
                  -${(calculateOriginalPrice() - calculateTotalPrice()).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center mt-2 text-lg font-bold">
              <span>Final Total:</span>
              <span>${calculateTotalPrice().toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-4">
          <Button 
            variant="outline"
            onClick={() => navigate('/admin/bookings')}
          >
            Cancel
          </Button>
          <Button 
            variant="default"
            onClick={handleSaveAppointment}
            disabled={isLoading || (selectedServices.length === 0 && selectedPackages.length === 0) || !validateStylistSelection()}
          >
            Save Appointment
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
