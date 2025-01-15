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

interface ServiceMultiSelectProps {
  selectedServices: string[];
  onServiceSelect: (serviceId: string) => void;
  onServiceRemove: (serviceId: string) => void;
}

export function ServiceMultiSelect({
  selectedServices,
  onServiceSelect,
  onServiceRemove,
}: ServiceMultiSelectProps) {
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-2">
      <Select onValueChange={onServiceSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Select services" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {services?.map((service) => (
              <SelectItem 
                key={service.id} 
                value={service.id}
                disabled={selectedServices.includes(service.id)}
              >
                {service.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <div className="flex flex-wrap gap-2">
        {services?.filter(service => selectedServices.includes(service.id)).map((service) => (
          <Badge key={service.id} variant="secondary">
            {service.name}
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 ml-1 hover:bg-transparent"
              onClick={() => onServiceRemove(service.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>
    </div>
  );
}