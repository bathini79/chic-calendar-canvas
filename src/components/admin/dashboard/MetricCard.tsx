
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  valueClassName?: string;
  onClick?: () => void;
}

export const MetricCard = ({ 
  title, 
  value, 
  icon, 
  trend, 
  className,
  valueClassName,
  onClick
}: MetricCardProps) => {
  return (
    <Card 
      className={cn("relative h-full overflow-hidden shadow-sm", 
        onClick ? "cursor-pointer hover:border-primary/50 transition-colors" : "",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          {icon && <div className="opacity-70">{icon}</div>}
        </div>
        <div className="space-y-2">
          <p className={cn("text-2xl font-bold", valueClassName)}>{value}</p>
          {trend && (
            <p className={`text-xs flex items-center ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}%
              <span className="text-muted-foreground ml-1">from last period</span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
