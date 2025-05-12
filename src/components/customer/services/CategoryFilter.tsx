import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface CategoryFilterProps {
  categories: any[];
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

export function CategoryFilter({ 
  categories, 
  selectedCategory, 
  onCategorySelect 
}: CategoryFilterProps) {
  return (
    <ScrollArea className="w-full p-2">
      <div className="flex gap-2 pb-2">
        <Badge
          variant={selectedCategory === null ? "default" : "outline"}
          className="cursor-pointer flex-none hover:bg-accent"
          onClick={() => onCategorySelect(null)}
        >
          All
        </Badge>
        {categories?.map((category) => (
          <Badge
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            className="cursor-pointer flex-none hover:bg-accent"
            onClick={() => onCategorySelect(category.id)}
          >
            {category.name}
          </Badge>
        ))}
      </div>
      <ScrollBar orientation="horizontal" className="opacity-0" />
    </ScrollArea>
  );
}