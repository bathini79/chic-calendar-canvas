
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface CategorySectionProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  categories: Array<{ id: string; name: string }>;
}

export function CategorySection({ value = [], onValueChange, categories }: CategorySectionProps) {
  const handleSelect = (categoryId: string) => {
    if (!value.includes(categoryId)) {
      onValueChange([...value, categoryId]);
    }
  };

  const handleRemove = (categoryId: string) => {
    onValueChange(value.filter(id => id !== categoryId));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Categories</label>
      <Select onValueChange={handleSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Select categories" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((category) => (
            <SelectItem 
              key={category.id} 
              value={category.id}
              disabled={value.includes(category.id)}
            >
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex flex-wrap gap-2">
        {categories
          .filter(category => value.includes(category.id))
          .map((category) => (
            <Badge key={category.id} variant="secondary">
              {category.name}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ml-1 hover:bg-transparent"
                onClick={() => handleRemove(category.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
      </div>
    </div>
  );
}
