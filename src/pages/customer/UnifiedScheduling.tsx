import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ServiceSelector } from "@/components/scheduling/ServiceSelector";
import { UnifiedCalendar } from "@/components/scheduling/UnifiedCalendar";
import { BookingSummary } from "@/components/scheduling/BookingSummary";
import { useCart } from "@/components/cart/CartContext";
import { toast } from "sonner";

interface SelectedService {
  serviceId: string;
  employeeId: string | 'any';
  startTime?: Date;
}

export default function UnifiedScheduling() {
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const { addToCart } = useCart();

  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*, services_categories(categories(*))')
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'active')
        .eq('employment_type', 'stylist');
      
      if (error) throw error;
      return data;
    },
  });

  const handleServiceSelect = (serviceId: string, employeeId: string) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.serviceId === serviceId);
      if (exists) {
        return prev.map(s => 
          s.serviceId === serviceId 
            ? { ...s, employeeId } 
            : s
        );
      }
      return [...prev, { serviceId, employeeId }];
    });
  };

  const handleTimeSelect = (serviceId: string, startTime: Date) => {
    setSelectedServices(prev => 
      prev.map(s => 
        s.serviceId === serviceId 
          ? { ...s, startTime } 
          : s
      )
    );
  };

  const handleConfirmBooking = async () => {
    try {
      // Validate all services have times selected
      const incomplete = selectedServices.some(s => !s.startTime);
      if (incomplete) {
        toast.error("Please select times for all services");
        return;
      }

      // Add all services to cart with their selected times
      for (const service of selectedServices) {
        await addToCart(service.serviceId, undefined, {
          employeeId: service.employeeId === 'any' ? undefined : service.employeeId,
          startTime: service.startTime?.toISOString(),
        });
      }

      toast.success("Services added to cart successfully");
    } catch (error) {
      toast.error("Error adding services to cart");
      console.error(error);
    }
  };

  if (servicesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Schedule Your Services</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Select your desired services, choose your preferred stylist, and book your appointments all in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <ServiceSelector
            services={services || []}
            employees={employees || []}
            selectedServices={selectedServices}
            onServiceSelect={handleServiceSelect}
          />
          
          {selectedServices.length > 0 && (
            <UnifiedCalendar
              selectedServices={selectedServices}
              onTimeSelect={handleTimeSelect}
            />
          )}
        </div>

        <div className="lg:col-span-1">
          <BookingSummary
            selectedServices={selectedServices}
            services={services || []}
            employees={employees || []}
            onConfirm={handleConfirmBooking}
          />
        </div>
      </div>
    </div>
  );
}