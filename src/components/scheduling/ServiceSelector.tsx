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
    <Card>
      <CardHeader>
        <CardTitle>Select Stylists</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">{item.service?.name || item.package?.name}</p>
              <p className="text-sm text-muted-foreground">
                {item.service?.duration || item.package?.duration} minutes
              </p>
            </div>
            <Select 
              value={selectedStylists[item.id] || ''} 
              onValueChange={(value) => onStylistSelect(item.id, value)}
            >
              <SelectTrigger className="w-[200px]">
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