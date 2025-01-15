import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ServiceForm } from "./ServiceForm";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
}

export function ServiceDialog({ open, onOpenChange, initialData }: ServiceDialogProps) {
  const queryClient = useQueryClient();

  const handleSubmit = async (data: any) => {
    try {
      if (initialData) {
        // Update service
        const { error: serviceError } = await supabase
          .from('services')
          .update({
            name: data.name,
            description: data.description,
            original_price: data.original_price,
            selling_price: data.selling_price,
            duration: data.duration,
          })
          .eq('id', initialData.id);
        
        if (serviceError) throw serviceError;

        // Update service categories
        const { error: deleteError } = await supabase
          .from('services_categories')
          .delete()
          .eq('service_id', initialData.id);
        
        if (deleteError) throw deleteError;

        if (data.categories.length > 0) {
          // Create services_categories entries with just the category IDs
          const serviceCategoriesData = data.categories.map((categoryId: string) => ({
            service_id: initialData.id,
            category_id: categoryId,
          }));

          const { error: categoriesError } = await supabase
            .from('services_categories')
            .insert(serviceCategoriesData);
          
          if (categoriesError) throw categoriesError;
        }
        
        toast.success('Service updated successfully');
      } else {
        // Create service
        const { data: newService, error: serviceError } = await supabase
          .from('services')
          .insert({
            name: data.name,
            description: data.description,
            original_price: data.original_price,
            selling_price: data.selling_price,
            duration: data.duration,
          })
          .select()
          .single();
        
        if (serviceError) throw serviceError;

        if (data.categories.length > 0) {
          // Create services_categories entries with just the category IDs
          const serviceCategoriesData = data.categories.map((categoryId: string) => ({
            service_id: newService.id,
            category_id: categoryId,
          }));

          const { error: categoriesError } = await supabase
            .from('services_categories')
            .insert(serviceCategoriesData);
          
          if (categoriesError) throw categoriesError;
        }
        
        toast.success('Service created successfully');
      }
      
      queryClient.invalidateQueries({ queryKey: ['services'] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Service' : 'Create Service'}</DialogTitle>
        </DialogHeader>
        <ServiceForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}