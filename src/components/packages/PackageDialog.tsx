import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PackageForm } from "./PackageForm";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
}

export function PackageDialog({ open, onOpenChange, initialData }: PackageDialogProps) {
  const queryClient = useQueryClient();

  const handleSubmit = async (data: any) => {
    try {
      if (initialData) {
        // Update package
        const { error: packageError } = await supabase
          .from('packages')
          .update({
            name: data.name,
            description: data.description,
            price: data.price,
            duration: data.duration,
            is_customizable: data.is_customizable,
            customizable_services: data.customizable_services,
            status: data.status,
            discount_type: data.discount_type,
            discount_value: data.discount_value,
            image_urls: data.image_urls,
          })
          .eq('id', initialData.id);
        
        if (packageError) throw packageError;

        // Delete existing services
        const { error: deleteError } = await supabase
          .from('package_services')
          .delete()
          .eq('package_id', initialData.id);
        
        if (deleteError) throw deleteError;

        // Insert new services
        if (data.services && data.services.length > 0) {
          const packageServicesData = data.services.map((serviceId: string) => ({
            package_id: initialData.id,
            service_id: serviceId,
          }));

          const { error: servicesError } = await supabase
            .from('package_services')
            .insert(packageServicesData);
          
          if (servicesError) throw servicesError;
        }
        
        toast.success('Package updated successfully');
      } else {
        // Create new package
        const { data: newPackage, error: packageError } = await supabase
          .from('packages')
          .insert({
            name: data.name,
            description: data.description,
            price: data.price,
            duration: data.duration,
            is_customizable: data.is_customizable,
            customizable_services: data.customizable_services,
            status: data.status,
            discount_type: data.discount_type,
            discount_value: data.discount_value,
            image_urls: data.image_urls,
          })
          .select()
          .single();
        
        if (packageError) throw packageError;

        // Insert services
        if (data.services && data.services.length > 0) {
          const packageServicesData = data.services.map((serviceId: string) => ({
            package_id: newPackage.id,
            service_id: serviceId,
          }));

          const { error: servicesError } = await supabase
            .from('package_services')
            .insert(packageServicesData);
          
          if (servicesError) throw servicesError;
        }
        
        toast.success('Package created successfully');
      }
      
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{initialData ? 'Edit Package' : 'Create Package'}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <div className="p-6 pt-0">
            <PackageForm
              initialData={initialData}
              onSubmit={handleSubmit}
              onCancel={() => onOpenChange(false)}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}