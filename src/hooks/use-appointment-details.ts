
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppointmentStatus } from "@/types/appointment";

export const useAppointmentDetails = (appointmentId: string | undefined) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      if (!appointmentId) throw new Error('No appointment ID provided');
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          bookings (
            *,
            service:services(*),
            package:packages(*),
            employee:employees(*)
          )
        `)
        .eq('id', appointmentId)
        .single();
      
      if (error) throw error;
      
      // Fetch location name if a location ID is provided
      let locationName = null;
      if (data.location) {
        try {
          const { data: locationData, error: locationError } = await supabase
            .from('locations')
            .select('name')
            .eq('id', data.location)
            .single();
            
          if (!locationError && locationData) {
            locationName = locationData.name;
          }
        } catch (locError) {
          console.error("Error fetching location:", locError);
        }
      }
      
      // Return data with location_name added
      return {
        ...data,
        location_name: locationName
      };
    },
    enabled: !!appointmentId
  });

  const isNoShow = data?.status === 'noshow'; // Fixed to match the correct enum value
  const isPending = data?.status === 'pending';
  const isCanceled = data?.status === 'canceled';
  const isConfirmed = data?.status === 'confirmed';
  const isCompleted = data?.status === 'completed';
  const isRefunded = data?.status === 'refunded' || data?.status === 'partially_refunded';
  const canCancel = isPending || isConfirmed;
  const canNoShow = isConfirmed;
  const canComplete = isConfirmed;
  const canRefund = isCompleted || isConfirmed;

  return {
    data,
    isLoading,
    error,
    isNoShow,
    isPending,
    isCanceled,
    isConfirmed,
    isCompleted,
    isRefunded,
    canCancel,
    canNoShow,
    canComplete,
    canRefund
  };
};
