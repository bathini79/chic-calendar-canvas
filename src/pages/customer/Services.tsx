import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export default function Services() {
  const navigate = useNavigate();
  
  const { data: services, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("status", "active");
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div>Loading services...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Our Services</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services?.map((service) => (
          <div key={service.id} className="border rounded-lg p-6 space-y-4">
            <h3 className="text-xl font-semibold">{service.name}</h3>
            <p className="text-muted-foreground">{service.description}</p>
            <div className="flex justify-between items-center">
              <p className="font-medium">₹{service.selling_price}</p>
              <Button onClick={() => navigate(`/book/service/${service.id}`)}>
                Book Now
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}