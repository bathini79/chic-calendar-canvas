import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ServiceSelectorProps {
  items: any[];
  selectedStylists: Record<string, string>;
  onStylistSelect: (itemId: string, stylistId: string) => void;
}

export function ServiceSelector({ items, selectedStylists, onStylistSelect }: ServiceSelectorProps) {
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('employment_type', 'stylist')
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card className="w-full">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg">Select Stylists</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {items?.map((item) => (
        <div 
          key={item.id} 
          className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{item.service?.name || item.package?.name}</p>
            <p className="text-sm text-muted-foreground">
              {item.service?.duration || item.package?.duration} minutes
            </p>
          </div>
          <Select 
            value={selectedStylists[item.id] || ''} 
            onValueChange={(value) => onStylistSelect(item.id, value)}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select stylist" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any Available Stylist</SelectItem>
              {employees?.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </CardContent>
  </Card>
  
  );
}