
import React from 'react';
import { Badge } from "@/components/ui/badge";
import type { AppointmentStatus } from '../types';

interface StatusBadgeProps {
  status: AppointmentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300';
      case 'confirmed':
        return 'bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300';
      case 'inprogress':
        return 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-300';
      case 'completed':
        return 'bg-green-100 hover:bg-green-200 text-green-800 border-green-300';
      case 'canceled':
        return 'bg-red-100 hover:bg-red-200 text-red-800 border-red-300';
      case 'noshow':
        return 'bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-300';
      case 'voided':
        return 'bg-red-100 hover:bg-red-200 text-red-800 border-red-300';
      case 'refunded':
        return 'bg-red-100 hover:bg-red-200 text-red-800 border-red-300';
      case 'partially_refunded':
        return 'bg-red-100 hover:bg-red-200 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'inprogress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'canceled':
        return 'Canceled';
      case 'noshow':
        return 'No Show';
      case 'voided':
        return 'Voided';
      case 'refunded':
        return 'Refunded';
      case 'partially_refunded':
        return 'Partially Refunded';
      default:
        return status;
    }
  };

  return (
    <Badge variant="outline" className={`${getStatusStyles()} uppercase text-xs px-2 py-0.5`}>
      {getStatusLabel()}
    </Badge>
  );
}
