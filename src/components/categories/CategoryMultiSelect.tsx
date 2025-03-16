
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CategoryMultiSelectProps {
  selectedCategories?: string[];
  onCategorySelect?: (categoryId: string) => void;
  onCategoryRemove?: (categoryId: string) => void;
  maxSelections?: number;
  // Add props used in ServiceForm
  selectedValues?: string[];
  onChange?: (values: string[]) => void;
}

export function CategoryMultiSelect({
  selectedCategories = [],
  onCategorySelect,
  onCategoryRemove,
  maxSelections,
  selectedValues = [],
  onChange,
}: CategoryMultiSelectProps) {
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Use the appropriate selected values based on which prop was provided
  const selected = selectedValues.length > 0 ? selectedValues : selectedCategories;

  const handleCategorySelect = (categoryId: string) => {
    if (onChange) {
      onChange([...selected, categoryId]);
    } else if (onCategorySelect) {
      onCategorySelect(categoryId);
    }
  };

  const handleCategoryRemove = (categoryId: string) => {
    if (onChange) {
      onChange(selected.filter(id => id !== categoryId));
    } else if (onCategoryRemove) {
      onCategoryRemove(categoryId);
    }
  };

  const isSelectionDisabled = maxSelections ? selected.length >= maxSelections : false;

  return (
    <div className="space-y-2">
      <Select 
        onValueChange={handleCategorySelect}
        disabled={isSelectionDisabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {categories?.map((category) => (
              <SelectItem 
                key={category.id} 
                value={category.id}
                disabled={selected.includes(category.id)}
              >
                {category.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <div className="flex flex-wrap gap-2">
        {categories?.filter(category => selected.includes(category.id)).map((category) => (
          <Badge key={category.id} variant="secondary">
            {category.name}
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 ml-1 hover:bg-transparent"
              onClick={() => handleCategoryRemove(category.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
