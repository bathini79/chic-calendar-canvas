
import React from 'react';
import { Progress } from '@/components/ui/progress';

interface CustomerSegmentRetentionProps {
  prepaidRate: number;
  membershipRate: number;
  highValueRate: number;
  recurringRate: number;
}

export function CustomerSegmentRetention({
  prepaidRate,
  membershipRate,
  highValueRate,
  recurringRate
}: CustomerSegmentRetentionProps) {
  const segments = [
    { name: 'Prepaid Customers', value: prepaidRate, color: 'bg-blue-500' },
    { name: 'Membership Customers', value: membershipRate, color: 'bg-purple-500' },
    { name: 'High-Value Customers', value: highValueRate, color: 'bg-amber-500' },
    { name: 'Recurring Customers', value: recurringRate, color: 'bg-green-500' },
  ];

  return (
    <div className="space-y-6">
      {segments.map((segment, index) => (
        <div key={index} className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{segment.name}</span>
            <span className="font-medium">{segment.value}%</span>
          </div>
          <div className="relative pt-1">
            <div className="overflow-hidden h-2 text-xs flex rounded bg-muted">
              <div
                style={{ width: `${segment.value}%` }}
                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${segment.color}`}
              ></div>
            </div>
          </div>
        </div>
      ))}
      
      <div className="pt-2 text-xs text-muted-foreground">
        <p className="mb-1">
          <span className="font-semibold">High-Value Customers:</span> 3+ appointments
        </p>
        <p>
          <span className="font-semibold">Recurring Customers:</span> Multiple visits in period
        </p>
      </div>
    </div>
  );
}
