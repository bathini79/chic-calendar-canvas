
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  Clock, 
  Ban, 
  FileWarning, 
  FileMinus,
  RefreshCw
} from 'lucide-react';
import { AppointmentStatus } from '../types';

interface StatusBadgeProps {
  status: AppointmentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case 'confirmed':
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border border-green-300">
          <Check className="h-3 w-3 mr-1" /> Confirmed
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300">
          <Clock className="h-3 w-3 mr-1" /> Pending
        </Badge>
      );
    case 'canceled':
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border border-red-300">
          <Ban className="h-3 w-3 mr-1" /> Canceled
        </Badge>
      );
    case 'completed':
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300">
          <Check className="h-3 w-3 mr-1" /> Completed
        </Badge>
      );
    case 'refunded':
      return (
        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-300">
          <RefreshCw className="h-3 w-3 mr-1" /> Refunded
        </Badge>
      );
    case 'partially_refunded':
      return (
        <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border border-indigo-300">
          <RefreshCw className="h-3 w-3 mr-1" /> Partially Refunded
        </Badge>
      );
    case 'noshow':
      return (
        <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300">
          <FileMinus className="h-3 w-3 mr-1" /> No Show
        </Badge>
      );
    case 'voided':
      return (
        <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300">
          <FileWarning className="h-3 w-3 mr-1" /> Voided
        </Badge>
      );
    case 'inprogress':
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300">
          <Clock className="h-3 w-3 mr-1" /> In Progress
        </Badge>
      );
    default:
      return (
        <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300">
          {status}
        </Badge>
      );
  }
}
