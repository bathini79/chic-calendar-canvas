import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function BookingForm() {
  const { id } = useParams();

  const { data: service, isLoading } = useQuery({
    queryKey: ["service", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div>Loading service details...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Book {service?.name}</h1>
      <p className="text-muted-foreground">
        Please select your preferred date and time for the service.
      </p>
      {/* We'll implement the actual booking form in the next iteration */}
      <div className="border rounded-lg p-6">
        <p>Booking form coming soon...</p>
      </div>
    </div>
  );
}