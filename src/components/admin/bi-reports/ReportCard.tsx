import React from "react";
import { Star, Crown, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ReportCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isPremium?: boolean;
  isStarred?: boolean;
  onClick: () => void;
  onStar: () => void;
}

export const ReportCard = ({
  title,
  description,
  icon: Icon,
  isPremium = false,
  isStarred = false,
  onClick,
  onStar,
}: ReportCardProps) => {
  return (
    <Card className="group cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold leading-tight">
                {title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {isPremium && (
                  <Badge variant="secondary" className="text-xs">
                    <Crown className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onStar();
              }}
              className={cn(
                "h-8 w-8 p-0 opacity-60 hover:opacity-100 transition-opacity",
                isStarred && "text-yellow-500 opacity-100"
              )}
            >
              <Star className={cn("h-4 w-4", isStarred && "fill-current")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent 
        className="space-y-4 cursor-pointer" 
        onClick={onClick}
      >
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {description}
        </p>
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center text-xs text-muted-foreground">
            <span>Click to view report</span>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
};