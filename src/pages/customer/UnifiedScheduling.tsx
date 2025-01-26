import { useCart } from "@/components/cart/CartContext";
import { ServiceSelector } from "@/components/scheduling/ServiceSelector";
import { UnifiedCalendar } from "@/components/scheduling/UnifiedCalendar";
import { BookingSummary } from "@/components/scheduling/BookingSummary";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function UnifiedScheduling() {
  const { items } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="container mx-auto py-8 text-center">
        <p className="text-lg text-muted-foreground mb-4">
          No services in cart. Please add services before scheduling.
        </p>
        <Button onClick={() => navigate('/services')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Browse Services
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Schedule Your Services</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <ServiceSelector />
          <UnifiedCalendar />
        </div>
        <div>
          <BookingSummary />
        </div>
      </div>
    </div>
  );
}