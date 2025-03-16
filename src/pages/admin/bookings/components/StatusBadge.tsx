
import { Badge } from "@/components/ui/badge";
import { AppointmentStatus } from "../types";

interface StatusBadgeProps {
  status: AppointmentStatus;
  size?: "default" | "large";
}

export function StatusBadge({ status, size = "default" }: StatusBadgeProps) {
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  
  switch (status) {
    case "pending":
      variant = "secondary";
      break;
    case "confirmed":
    case "paid":
      variant = "default";
      break;
    case "completed":
      variant = "default";
      break;
    case "inprogress":
      variant = "outline";
      break;
    case "canceled":
    case "refunded":
    case "partially_refunded":
    case "voided":
    case "noshow":
      variant = "destructive";
      break;
    default:
      variant = "secondary";
  }
  
  const className = size === "large" ? "px-3 py-1 text-sm" : "";
  
  return (
    <Badge variant={variant} className={className}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}
