
import React from "react";
import { Badge } from "@/components/ui/badge";
import { AppointmentStatus } from "../types";

interface StatusBadgeProps {
  status: AppointmentStatus | string;
  size?: "default" | "sm" | "lg";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "default" }) => {
  // Get variant and text based on status
  let variant: "default" | "destructive" | "outline" | "secondary" | "success";
  let text: string;

  switch (status) {
    case "pending":
      variant = "secondary";
      text = "Pending";
      break;
    case "confirmed":
      variant = "default";
      text = "Confirmed";
      break;
    case "completed":
      variant = "success";
      text = "Completed";
      break;
    case "canceled":
      variant = "destructive";
      text = "Canceled";
      break;
    case "noshow":
    case "no-show":
      variant = "destructive";
      text = "No-show";
      break;
    case "inprogress":
      variant = "secondary";
      text = "In Progress";
      break;
    case "refunded":
      variant = "outline";
      text = "Refunded";
      break;
    case "partially_refunded":
      variant = "outline";
      text = "Partially Refunded";
      break;
    case "voided":
      variant = "outline";
      text = "Voided";
      break;
    default:
      variant = "outline";
      text = status.charAt(0).toUpperCase() + status.slice(1);
  }

  return <Badge variant={variant} size={size}>{text}</Badge>;
};
