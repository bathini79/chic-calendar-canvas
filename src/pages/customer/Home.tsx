import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Welcome to Our Salon</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Experience the best in beauty and wellness services. Book your appointment today
          and let our expert staff take care of you.
        </p>
        <Button onClick={() => navigate("/services")} size="lg">
          Book Now
        </Button>
      </section>
    </div>
  );
}