import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "./CartContext";
import { Badge } from "@/components/ui/badge";

interface CartIconProps {
  onClick: () => void;
}

export function CartIcon({ onClick }: CartIconProps) {
  const { items, isLoading } = useCart();

  if (isLoading) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={onClick}
    >
      <ShoppingCart className="h-5 w-5" />
      {items.length > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full p-0"
        >
          {items.length}
        </Badge>
      )}
    </Button>
  );
}