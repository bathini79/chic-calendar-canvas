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

  // If we have initialData, fetch the associated services
  const fetchPackageServices = async (packageId: string) => {
    const { data: packageServices, error } = await supabase
      .from('package_services')
      .select('service_id')
      .eq('package_id', packageId);
    
    if (error) {
      console.error('Error fetching package services:', error);
      return [];
    }

    return packageServices.map(ps => ps.service_id);
  };

  const handleSubmit = async (data: any) => {
    try {
      if (initialData) {
        // First update the package
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

        // Then handle package services update
        if (data.services && data.services.length > 0) {
          // First delete existing services
          const { error: deleteError } = await supabase
            .from('package_services')
            .delete()
            .eq('package_id', initialData.id);
          
          if (deleteError) throw deleteError;

          // Then insert new services
          const packageServicesData = data.services.map((serviceId: string) => ({
            package_id: initialData.id,
            service_id: serviceId,
          }));

          const { error: insertError } = await supabase
            .from('package_services')
            .insert(packageServicesData);
          
          if (insertError) throw insertError;
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

        // Insert services for new package
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
      
      // Invalidate queries to refresh the data
      await queryClient.invalidateQueries({ queryKey: ['packages'] });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message);
    }
  };

  // If we have initialData, fetch the services before rendering the form
  const enhancedInitialData = async () => {
    if (initialData?.id) {
      const services = await fetchPackageServices(initialData.id);
      return {
        ...initialData,
        services,
      };
    }
    return initialData;
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
              initialData={enhancedInitialData()}
              onSubmit={handleSubmit}
              onCancel={() => onOpenChange(false)}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}