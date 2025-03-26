
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChurnMetricCardProps {
  title: string;
  value: number | string;
  description?: string;
  percentage?: string;
  trend?: number;
  tooltip?: string;
  icon?: React.ReactNode;
  trendReversed?: boolean;
}

export function ChurnMetricCard({
  title,
  value,
  description,
  percentage,
  trend,
  tooltip,
  icon,
  trendReversed = false
}: ChurnMetricCardProps) {
  // Determine trend badge color - for churn, negative trend is good (decreasing churn)
  // so we reverse the logic if trendReversed is true
  const getTrendBadge = () => {
    if (trend === undefined) return null;
    
    const isPositiveTrend = trendReversed ? trend < 0 : trend > 0;
    const isNegativeTrend = trendReversed ? trend > 0 : trend < 0;
    
    if (isPositiveTrend) {
      return <Badge variant="success" className="ml-1">{trend > 0 ? '+' : ''}{trend}{typeof value === 'string' && value.includes('%') ? '%' : ''}</Badge>;
    } else if (isNegativeTrend) {
      return <Badge variant="destructive" className="ml-1">{trend}{typeof value === 'string' && value.includes('%') ? '%' : ''}</Badge>;
    } else {
      return <Badge variant="secondary" className="ml-1">0{typeof value === 'string' && value.includes('%') ? '%' : ''}</Badge>;
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {icon}
              <span className="text-sm font-medium">{title}</span>
            </div>
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          <div className="flex items-center">
            <span className="text-3xl font-bold">{value}</span>
            {getTrendBadge()}
          </div>
          
          {percentage && (
            <div className="text-sm text-muted-foreground mt-1">
              {percentage} of total
            </div>
          )}
          
          {description && (
            <div className="text-xs text-muted-foreground mt-1">
              {description}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
