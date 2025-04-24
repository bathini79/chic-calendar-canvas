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

  // Reset enhancedData when dialog opens without initialData
  useEffect(() => {
    if (open) {
      if (!initialData) {
        // Reset state when creating a new package
        setEnhancedData(null);
      } else {
        // Fetch data for editing an existing package
        fetchPackageData();
      }
    }
  }, [open, initialData]);

  const fetchPackageData = async () => {
    if (initialData?.id) {
      const { data: servicesResponse, error: servicesError } = await supabase
        .from('package_services')
        .select('service_id, package_selling_price')
        .eq('package_id', initialData.id);
      
      if (servicesError) {
        console.error('Error fetching package services:', servicesError);
        return;
      }

      // Create a map of service_id to selling_price
      const serviceSellingPrices = {};
      servicesResponse.forEach(ps => {
        if (ps.package_selling_price !== null) {
          serviceSellingPrices[ps.service_id] = ps.package_selling_price;
        }
      });

      setEnhancedData({
        ...initialData,
        services: servicesResponse.map(ps => ps.service_id),
        selling_price: serviceSellingPrices,
        categories: initialData.categories || []
      });
    }
  };

  const handleSubmit = async (data: any) => {
    try {
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

        // Handle package services update with a patch approach
        if (data.services && data.services.length > 0) {
          // First, fetch current package services to determine what to add/update/remove
          const { data: currentServices, error: fetchError } = await supabase
            .from('package_services')
            .select('service_id, package_selling_price')
            .eq('package_id', initialData.id);
          
          if (fetchError) {
            console.error('Error fetching current package services:', fetchError);
            throw fetchError;
          }
          
          // Determine services to add, update, or remove
          const currentServiceIds = currentServices.map(s => s.service_id);
          const newServiceIds = data.services;
          
          // Services to add (in new set but not in current set)
          const servicesToAdd = newServiceIds.filter(id => !currentServiceIds.includes(id));
          
          // Services to keep and potentially update (in both sets)
          const servicesToUpdate = newServiceIds.filter(id => currentServiceIds.includes(id));
          
          // Services to remove (in current set but not in new set)
          const servicesToRemove = currentServiceIds.filter(id => !newServiceIds.includes(id));
          
          // Handle removals - using composite key (package_id, service_id)
          if (servicesToRemove.length > 0) {
            for (const serviceId of servicesToRemove) {
              const { error: removeError } = await supabase
                .from('package_services')
                .delete()
                .eq('package_id', initialData.id)
                .eq('service_id', serviceId);
              
              if (removeError) {
                console.error(`Error removing package service ${serviceId}:`, removeError);
                throw removeError;
              }
            }
          }
          
          // Handle additions
          if (servicesToAdd.length > 0) {
            const newServices = servicesToAdd.map(serviceId => ({
              package_id: initialData.id,
              service_id: serviceId,
              package_selling_price: data.selling_price?.[serviceId] || null,
            }));
            
            const { error: addError } = await supabase
              .from('package_services')
              .insert(newServices);
            
            if (addError) {
              console.error('Error adding package services:', addError);
              throw addError;
            }
          }
          
          // Handle updates for existing services (price changes) - using composite key
          for (const serviceId of servicesToUpdate) {
            const currentService = currentServices.find(s => s.service_id === serviceId);
            const newPrice = data.selling_price?.[serviceId] || null;
            
            // Only update if price has changed
            if (currentService && currentService.package_selling_price !== newPrice) {
              const { error: updateError } = await supabase
                .from('package_services')
                .update({ package_selling_price: newPrice })
                .eq('package_id', initialData.id)
                .eq('service_id', serviceId);
              
              if (updateError) {
                console.error(`Error updating package service ${serviceId}:`, updateError);
                throw updateError;
              }
            }
          }
        } else {
          // If no services are selected, remove all existing services
          const { error: deleteAllError } = await supabase
            .from('package_services')
            .delete()
            .eq('package_id', initialData.id);
          
          if (deleteAllError) {
            console.error('Error removing all package services:', deleteAllError);
            throw deleteAllError;
          }
        }
        
        toast.success('Package updated successfully');
      } else {
        // Create new package
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
            package_selling_price: data.selling_price?.[serviceId] || null,
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
