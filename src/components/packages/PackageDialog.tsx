import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
          })
          .eq('id', initialData.id);
        
        if (packageError) throw packageError;

        // Delete existing services
        const { error: deleteError } = await supabase
          .from('package_services')
          .delete()
          .eq('package_id', initialData.id);
        
        if (deleteError) throw deleteError;

        // Insert new services if any are selected
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
          })
          .select()
          .single();
        
        if (packageError) throw packageError;

        // Insert services if any are selected
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Package' : 'Create Package'}</DialogTitle>
        </DialogHeader>
        <PackageForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}