
import { cva, type VariantProps } from "class-variance-authority";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";

export type StatusType = 
  | "pending"
  | "confirmed"
  | "inprogress"
  | "completed"
  | "canceled"
  | "voided"
  | "refunded"
  | "partially_refunded"
  | "noshow";

const statusVariants = cva("", {
  variants: {
    status: {
      pending: "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300",
      confirmed: "bg-green-100 text-green-800 hover:bg-green-200 border-green-300",
      inprogress: "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-300",
      completed: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-300",
      canceled: "bg-red-100 text-red-800 hover:bg-red-200 border-red-300",
      voided: "bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300",
      refunded: "bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-300",
      partially_refunded: "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-indigo-300",
      noshow: "bg-rose-100 text-rose-800 hover:bg-rose-200 border-rose-300",
    },
  },
  defaultVariants: {
    status: "pending",
  },
});

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement>, 
  VariantProps<typeof statusVariants> {
  status: StatusType;
  showLabel?: boolean;
}

const statusLabels: Record<StatusType, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  inprogress: "In Progress",
  completed: "Completed",
  canceled: "Canceled",
  voided: "Voided",
  refunded: "Refunded",
  partially_refunded: "Partially Refunded",
  noshow: "No Show"
};

export function StatusBadge({ 
  status, 
  className, 
  showLabel = true,
  ...props 
}: StatusBadgeProps) {
  return (
    <Badge 
      className={cn(statusVariants({ status }), className)} 
      {...props}
    >
      {showLabel ? statusLabels[status] : status}
    </Badge>
  );
}
