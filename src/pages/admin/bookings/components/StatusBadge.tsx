
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Ban, 
  RotateCcw,
  CalendarCheck
} from "lucide-react";
import type { AppointmentStatus } from '@/types/appointment';

interface StatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

// Extend the Badge component to support these additional variants
declare module "@/components/ui/badge" {
  interface BadgeVariantsProps {
    variant: "default" | "destructive" | "outline" | "secondary" | "success" | "info" | "info2" | "warning";
  }
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const getStatusConfig = () => {
    switch (status) {
      // Completed statuses - green
      case 'completed':
        return {
          label: 'Completed',
          icon: <CheckCircle className="h-3 w-3 mr-1" />,
          variant: 'success' as const
        };
      
      // Active/Positive statuses - primary color (blue/purple)
      case 'confirmed':
        return {
          label: 'Confirmed',
          icon: <CalendarCheck className="h-3 w-3 mr-1" />,
          variant: 'info' as const
        };
      case 'booked':
        return {
          label: 'Booked',
          icon: <CalendarCheck className="h-3 w-3 mr-1" />,
          variant: 'info2' as const
        };
      
      // In-progress statuses - amber/warning
      case 'inprogress':
      case 'pending':
        return {
          label: status === 'inprogress' ? 'In Progress' : 'Pending',
          icon: <Clock className="h-3 w-3 mr-1" />,
          variant: 'warning' as const
        };
      
      // Canceled statuses - red
      case 'canceled':
        return {
          label: 'Canceled',
          icon: <XCircle className="h-3 w-3 mr-1" />,
          variant: 'destructive' as const
        };
      
      // Administrative cancellations - red with different icon
      case 'voided':
        return {
          label: 'Voided',
          icon: <Ban className="h-3 w-3 mr-1" />,
          variant: 'destructive' as const
        };
      
      // Refund statuses - purple/info
      case 'refunded':
        return {
          label: 'Refunded',
          icon: <RotateCcw className="h-3 w-3 mr-1" />,
          variant: 'info' as const
        };
      case 'partially_refunded':
        return {
          label: 'Partially Refunded',
          icon: <RotateCcw className="h-3 w-3 mr-1" />,
          variant: 'info' as const
        };
      
      // No-show cases - gray/outline
      case 'noshow':
        return {
          label: 'No Show',
          icon: <Ban className="h-3 w-3 mr-1" />,
          variant: 'outline' as const
        };
      
      // Default case
      default:
        return {
          label: status || 'Pending',
          icon: <Clock className="h-3 w-3 mr-1" />,
          variant: 'outline' as const
        };
    }
  };

  const { label, icon, variant } = getStatusConfig();

  return (
    <Badge
      variant={variant}
      className={`flex items-center text-xs ${className}`}
    >
      {icon}
      {label}
    </Badge>
  );
};
