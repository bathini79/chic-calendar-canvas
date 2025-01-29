import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CategoryDialog } from "@/components/categories/CategoryDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AdminServices() {
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  
  const { data: categories, refetch: refetchCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Admin Services</h1>
      <Button onClick={() => setCategoryDialogOpen(true)}>Add Category</Button>
      
      <div className="mt-4">
        {categories?.map((category) => (
          <div key={category.id} className="p-4 border rounded-lg bg-card">
            <h3 className="font-medium">{category.name}</h3>
          </div>
        ))}
      </div>
      
      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        onSuccess={refetchCategories}
      />
    </div>
  );
}
