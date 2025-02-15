
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
import { useEffect, useState } from "react";

interface PackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
}

export function PackageDialog({ open, onOpenChange, initialData }: PackageDialogProps) {
  const queryClient = useQueryClient();
  const [enhancedData, setEnhancedData] = useState<any>(null);

  useEffect(() => {
    const fetchPackageData = async () => {
      if (initialData?.id) {
        const { data: servicesResponse, error: servicesError } = await supabase
          .from('package_services')
          .select('service_id')
          .eq('package_id', initialData.id);
        
        if (servicesError) {
          console.error('Error fetching package services:', servicesError);
          return;
        }

        console.log('Initial Data:', initialData);
        setEnhancedData({
          ...initialData,
          services: servicesResponse.map(ps => ps.service_id),
          categories: initialData.categories || []
        });
      } else {
        setEnhancedData(null);
      }
    };

    fetchPackageData();
  }, [initialData]);

  const handleSubmit = async (data: any) => {
    try {
      console.log('Submitting package data:', data);
      const packageData = {
        name: data.name,
        description: data.description,
        price: data.price,
        duration: data.duration,
        is_customizable: data.is_customizable,
        customizable_services: data.customizable_services || [],
        status: data.status,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        image_urls: data.image_urls || [],
        categories: data.categories || []
      };

      if (initialData) {
        // Update package
        const { error: packageError } = await supabase
          .from('packages')
          .update(packageData)
          .eq('id', initialData.id);
        
        if (packageError) {
          console.error('Error updating package:', packageError);
          throw packageError;
        }

        // Handle package services update
        if (data.services && data.services.length > 0) {
          const { error: deleteError } = await supabase
            .from('package_services')
            .delete()
            .eq('package_id', initialData.id);
          
          if (deleteError) {
            console.error('Error deleting package services:', deleteError);
            throw deleteError;
          }

          const packageServicesData = data.services.map((serviceId: string) => ({
            package_id: initialData.id,
            service_id: serviceId,
          }));

          const { error: insertServicesError } = await supabase
            .from('package_services')
            .insert(packageServicesData);
          
          if (insertServicesError) {
            console.error('Error inserting package services:', insertServicesError);
            throw insertServicesError;
          }
        }
        
        toast.success('Package updated successfully');
      } else {
        // Create new package
        console.log('Creating new package with data:', packageData);
        const { data: newPackage, error: packageError } = await supabase
          .from('packages')
          .insert(packageData)
          .select()
          .single();
        
        if (packageError) {
          console.error('Error creating package:', packageError);
          throw packageError;
        }

        // Insert services for new package
        if (data.services && data.services.length > 0) {
          const packageServicesData = data.services.map((serviceId: string) => ({
            package_id: newPackage.id,
            service_id: serviceId,
          }));

          const { error: servicesError } = await supabase
            .from('package_services')
            .insert(packageServicesData);
          
          if (servicesError) {
            console.error('Error inserting package services:', servicesError);
            throw servicesError;
          }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{initialData ? 'Edit Package' : 'Create Package'}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <div className="p-6 pt-0">
            <PackageForm
              initialData={enhancedData}
              onSubmit={handleSubmit}
              onCancel={() => onOpenChange(false)}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
