import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function BookingForm() {
  const { id } = useParams();
  // Get the type of booking from the URL (service or package)
  const bookingType = window.location.pathname.includes('/book/package/') ? 'package' : 'service';

  const { data: bookingItem, isLoading } = useQuery({
    queryKey: [bookingType, id],
    queryFn: async () => {
      const table = bookingType === 'package' ? 'packages' : 'services';
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (error) {
        toast.error(`Error loading ${bookingType} details`);
        throw error;
      }

      if (!data) {
        toast.error(`${bookingType} not found`);
        return null;
      }

      return data;
    },
  });

  if (isLoading) {
    return <div>Loading {bookingType} details...</div>;
  }

  if (!bookingItem) {
    return <div>This {bookingType} is not available.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Book {bookingItem.name}</h1>
      <p className="text-muted-foreground">
        Please select your preferred date and time for the {bookingType}.
      </p>
      <div className="border rounded-lg p-6">
        <p>Booking form coming soon...</p>
      </div>
    </div>
  );
}