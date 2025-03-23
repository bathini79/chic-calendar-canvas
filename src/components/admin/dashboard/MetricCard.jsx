
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricCard({ 
  title, 
  value, 
  description, 
  icon, 
  trend, 
  trendLabel,
  className
}) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend !== undefined) && (
          <div className="flex items-center text-xs text-muted-foreground">
            {trend !== undefined && (
              <span className={cn(
                "mr-1 flex items-center", 
                trend > 0 ? "text-green-500" : trend < 0 ? "text-red-500" : ""
              )}>
                {trend > 0 ? (
                  <ArrowUpIcon className="h-3 w-3 mr-0.5" />
                ) : trend < 0 ? (
                  <ArrowDownIcon className="h-3 w-3 mr-0.5" />
                ) : null}
                {Math.abs(trend)}%
              </span>
            )}
            <span>{trendLabel || description}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
