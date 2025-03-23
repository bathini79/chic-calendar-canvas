
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from './MetricCard';
import { ArrowUpRight, DollarSign, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export const FinancialDashboard = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Financial Overview</h2>
      <p className="text-muted-foreground">
        This is a placeholder for the financial dashboard.
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={formatPrice(24500)}
          icon={<DollarSign className="h-4 w-4" />}
          trend={{ value: 12, isPositive: true }}
        />
        <MetricCard
          title="New Customers"
          value="120"
          icon={<Users className="h-4 w-4" />}
          trend={{ value: 8, isPositive: true }}
        />
        <MetricCard
          title="Average Order Value"
          value={formatPrice(1250)}
          icon={<ArrowUpRight className="h-4 w-4" />}
          trend={{ value: 3, isPositive: true }}
        />
        <MetricCard
          title="Refund Rate"
          value="2.5%"
          icon={<TrendingDown className="h-4 w-4" />}
          trend={{ value: 0.8, isPositive: false }}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Financial Report</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-10">
            Financial report chart will be displayed here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
