
import React from "react";
import { Badge } from "@/components/ui/badge";
import { AppointmentStatus } from "@/types/appointment";

export const getStatusBackgroundColor = (
  status?: AppointmentStatus
): string => {
  if (!status) return "";

  switch (status) {
    case "pending":
      return "bg-yellow-50";
    case "booked":
      return "bg-blue-50";
    case "confirmed":
      return "bg-blue-100";
    case "inprogress":
      return "bg-purple-50";
    case "completed":
      return "bg-green-50";
    case "noshow":
      return "bg-red-50";
    case "canceled":
      return "bg-gray-100";
    case "voided":
      return "bg-gray-100";
    case "refunded":
      return "bg-orange-50";
    case "partially_refunded":
      return "bg-orange-100";
    default:
      return "";
  }
};

export const getStatusVariant = (
  status: AppointmentStatus
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "pending":
      return "outline";
    case "booked":
      return "secondary";
    case "confirmed":
      return "secondary";
    case "inprogress":
      return "secondary";
    case "completed":
      return "default";
    case "noshow":
    case "canceled":
    case "voided":
      return "destructive";
    case "refunded":
    case "partially_refunded":
      return "outline";
    default:
      return "outline";
  }
};

export const getStatusLabel = (status: AppointmentStatus): string => {
  switch (status) {
    case "pending":
      return "Pending";
    case "booked":
      return "Booked";
    case "confirmed":
      return "Confirmed";
    case "inprogress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "noshow":
      return "No Show";
    case "canceled":
      return "Canceled";
    case "voided":
      return "Voided";
    case "refunded":
      return "Refunded";
    case "partially_refunded":
      return "Partially Refunded";
    default:
      return status;
  }
};

interface StatusBadgeProps {
  status: AppointmentStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const variant = getStatusVariant(status);
  const label = getStatusLabel(status);

  return (
    <Badge variant={variant} className="min-w-[100px] text-center">
      {label}
    </Badge>
  );
};
