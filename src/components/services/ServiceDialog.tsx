
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ServiceForm } from "./ServiceForm";
import { toast } from "sonner";

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
}

export function ServiceDialog({ 
  open, 
  onOpenChange,
  initialData 
}: ServiceDialogProps) {
  const { data: service, isLoading } = useQuery({
    queryKey: ['service', initialData?.id],
    queryFn: async () => {
      if (!initialData?.id) return null;
      
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          services_categories (
            categories (
              id,
              name
            )
          ),
          service_locations (
            location_id
          )
        `)
        .eq('id', initialData.id)
        .maybeSingle();
      
      if (error) {
        toast.error("Error loading service");
        throw error;
      }
      
      if (!data) {
        toast.error("Service not found");
        onOpenChange(false);
        return null;
      }

      return {
        ...data,
        categories: data.services_categories?.map(sc => sc.categories) || []
      };
    },
    enabled: !!initialData?.id,
  });

  const serviceData = service || initialData;

  if (initialData?.id && isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>
          {initialData?.id ? 'Edit Service' : 'Create New Service'}
        </DialogTitle>
        <ServiceForm 
          initialData={serviceData} 
          onSuccess={() => onOpenChange(false)} 
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
