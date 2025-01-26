import { useCart } from "@/components/cart/CartContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function UnifiedScheduling() {
  const { items } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (items.length === 0) {
      navigate('/services');
    }
  }, [items, navigate]);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Schedule Your Services</h1>
      <div className="grid gap-6">
        {items.map((item) => (
          <div key={item.id} className="border p-4 rounded-lg">
            <h2 className="font-semibold">
              {item.service?.name || item.package?.name}
            </h2>
            <p className="text-muted-foreground">
              Duration: {item.service?.duration || item.package?.duration} minutes
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}