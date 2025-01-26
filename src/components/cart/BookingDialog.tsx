import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { BookingWizard } from "./BookingWizard";

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
}

export function BookingDialog({ open, onOpenChange, item }: BookingDialogProps) {
  const [services, setServices] = useState<any[]>([]);

  useQuery({
    queryKey: ['booking-services', item?.service_id, item?.package_id],
    enabled: open && (!!item?.service_id || !!item?.package_id),
    queryFn: async () => {
      if (item.service_id) {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('id', item.service_id)
          .single();
        
        if (error) throw error;
        setServices([data]);
        return data;
      } else if (item.package_id) {
        const { data, error } = await supabase
          .from('package_services')
          .select(`
            service:services(*)
          `)
          .eq('package_id', item.package_id);
        
        if (error) throw error;
        setServices(data.map(d => d.service));
        return data;
      }
    },
  });

  const handleComplete = async (bookings: any[]) => {
    try {
      // Create bookings
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error("Please sign in to book appointments");
        return;
      }

      for (const booking of bookings) {
        const startTime = new Date(`${booking.date.toISOString().split('T')[0]}T${booking.time}`);
        const endTime = new Date(startTime.getTime() + booking.service.duration * 60000);

        const { error } = await supabase
          .from('bookings')
          .insert([
            {
              service_id: booking.service.id,
              employee_id: booking.stylist,
              customer_id: session.session.user.id,
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              status: 'confirmed',
            },
          ]);

        if (error) throw error;
      }

      // Update cart item status
      await supabase
        .from('cart_items')
        .update({ status: 'scheduled' })
        .eq('id', item.id);

      toast.success("Appointments scheduled successfully");
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Error scheduling appointments");
      console.error('Error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule Appointment{services.length > 1 ? 's' : ''}</DialogTitle>
        </DialogHeader>
        {services.length > 0 && (
          <BookingWizard
            services={services}
            onComplete={handleComplete}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}