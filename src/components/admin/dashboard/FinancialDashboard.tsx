
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DailyRevenue } from '@/components/admin/reports/DailyRevenue';

interface FinancialDashboardProps {
  expanded?: boolean;
  onExpand?: () => void;
}

export function FinancialDashboard({ expanded = true, onExpand }: FinancialDashboardProps) {
  return (
    <div className="space-y-6">
      <DailyRevenue expanded={expanded} onExpand={onExpand} />
    </div>
  );
}
