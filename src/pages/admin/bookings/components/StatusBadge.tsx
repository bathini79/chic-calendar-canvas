
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Ban, RotateCcw } from "lucide-react";
import type { AppointmentStatus } from '../types';

interface StatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
  large?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className, large }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'completed':
        return {
          label: 'Completed',
          icon: <CheckCircle className={`${large ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />,
          variant: 'success' as const
        };
      case 'confirmed':
        return {
          label: 'Confirmed',
          icon: <CheckCircle className={`${large ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />,
          variant: 'default' as const
        };
      case 'inprogress':
        return {
          label: 'In Progress',
          icon: <Clock className={`${large ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />,
          variant: 'warning' as const
        };
      case 'canceled':
        return {
          label: 'Canceled',
          icon: <XCircle className={`${large ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />,
          variant: 'destructive' as const
        };
      case 'voided':
        return {
          label: 'Voided',
          icon: <Ban className={`${large ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />,
          variant: 'destructive' as const
        };
      case 'refunded':
        return {
          label: 'Refunded',
          icon: <RotateCcw className={`${large ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />,
          variant: 'destructive' as const
        };
      case 'partially_refunded':
        return {
          label: 'Partially Refunded',
          icon: <RotateCcw className={`${large ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />,
          variant: 'destructive' as const
        };
      case 'noshow':
        return {
          label: 'No Show',
          icon: <Ban className={`${large ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />,
          variant: 'destructive' as const
        };
      default:
        return {
          label: 'Pending',
          icon: <Clock className={`${large ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />,
          variant: 'outline' as const
        };
    }
  };

  const { label, icon, variant } = getStatusConfig();

  return (
    <Badge
      variant={variant}
      className={`flex items-center ${large ? 'text-sm py-1 px-2' : ''} ${className || ''}`}
    >
      {icon}
      {label}
    </Badge>
  );
};
