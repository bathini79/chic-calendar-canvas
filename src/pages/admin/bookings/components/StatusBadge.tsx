
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AppointmentStatus } from '../types';

interface StatusBadgeProps {
  status: AppointmentStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let variant: 'default' | 'destructive' | 'outline' | 'secondary' = 'default';
  let label = status;

  switch (status) {
    case 'confirmed':
      variant = 'default';
      break;
    case 'pending':
      variant = 'secondary';
      break;
    case 'inprogress':
      variant = 'secondary';
      break;
    case 'completed':
      variant = 'default';
      break;
    case 'canceled':
      variant = 'destructive';
      break;
    case 'noshow':
      variant = 'destructive';
      break;
    case 'refunded':
      variant = 'destructive';
      break;
    case 'voided':
      variant = 'destructive';
      break;
    default:
      variant = 'outline';
      break;
  }

  return (
    <Badge variant={variant} className="capitalize">
      {status.replace('_', ' ')}
    </Badge>
  );
};
