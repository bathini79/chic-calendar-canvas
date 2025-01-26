import { useCart } from "@/components/cart/CartContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ServiceSelector() {
  const { items, setCartOpen } = useCart();

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

  const handleStylistChange = async (serviceId: string, employeeId: string) => {
    // This will be implemented in the cart context update
    console.log('Stylist selected:', employeeId, 'for service:', serviceId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Selected Services</CardTitle>
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
            <Select onValueChange={(value) => handleStylistChange(item.id, value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select stylist" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any_stylist">Any Available Stylist</SelectItem>
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