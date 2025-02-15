import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
  import { Badge } from "@/components/ui/badge";
  import { X } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { useState, useEffect } from "react";
  import { supabase } from "@/integrations/supabase/client";
  import { toast } from "sonner";
  
  interface Item {
    id: string;
    name: string;
  }
  
  interface ItemMultiSelectProps {
    selectedItems: string[];
    onItemSelected: (itemId: string) => void;
    onItemRemoved: (itemId: string) => void;
    excludeItems?: string[];
    isLoading?: boolean;
  }
  
  export function ItemMultiSelect({
    selectedItems,
    onItemSelected,
    onItemRemoved,
    excludeItems = [],
    isLoading = false,
  }: ItemMultiSelectProps) {
    const [availableItems, setAvailableItems] = useState<Item[]>([]);
  
    useEffect(() => {
      const fetchItems = async () => {
        try {
          const { data: items, error } = await supabase
            .from('inventory_items')
            .select('id, name')
            .eq('status', 'active')
            .order('name');
          if (error) {
            throw error;
          }
          setAvailableItems(items || []);
        } catch (error: any) {
          console.error('Error fetching items:', error);
          toast.error('Failed to load items');
        }
      };
  
      fetchItems();
    }, []);
  
    const availableItemsFiltered = availableItems?.filter(
      (item) =>
        !selectedItems.includes(item.id) && !excludeItems.includes(item.id)
    );
  
    return (
      <div className="space-y-2">
        <Select onValueChange={onItemSelected}>
          <SelectTrigger>
            <SelectValue placeholder={isLoading? "Loading..." : "Select items"} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {availableItemsFiltered?.length === 0 && !isLoading && (
                <div className="p-2 text-sm text-muted-foreground">
                  No items available. Add items in the Items tab first.
                </div>
              )}
              {availableItemsFiltered?.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-2">
          {availableItems
            ?.filter((item) => selectedItems.includes(item.id))
            .map((item) => (
              <Badge key={item.id} variant="secondary">
                {item.name}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 hover:bg-transparent"
                  onClick={() => onItemRemoved(item.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
        </div>
      </div>
    );
  }
  