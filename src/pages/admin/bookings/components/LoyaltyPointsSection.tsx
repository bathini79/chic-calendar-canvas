
import React, { useState } from "react";
import { Award, Info } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LoyaltyPointsSectionProps {
  customerName: string;
  customerPoints: number;
  pointsToEarn: number;
  maxPointsToRedeem: number;
  pointValue: number;
  onPointsToRedeemChange: (points: number) => void;
  onUsePointsChange: (usePoints: boolean) => void;
  usePoints: boolean;
  pointsToRedeem: number;
  minRedemptionPoints: number;
}

export function LoyaltyPointsSection({
  customerName,
  customerPoints,
  pointsToEarn,
  maxPointsToRedeem,
  pointValue,
  onPointsToRedeemChange,
  onUsePointsChange,
  usePoints,
  pointsToRedeem,
  minRedemptionPoints,
}: LoyaltyPointsSectionProps) {
  // Determine if customer has enough points to redeem
  const hasEnoughPoints = customerPoints >= minRedemptionPoints;
  
  // Format amount to currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Handle slider change
  const handleSliderChange = (value: number[]) => {
    onPointsToRedeemChange(value[0]);
  };
  
  return (
    <div className="space-y-3 mt-4 border rounded-md p-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <span className="font-medium">Loyalty Points</span>
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-xs">
                Loyalty points earned are based on eligible services and packages.
                Each point is worth {formatCurrency(pointValue)} and can be redeemed on future purchases.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <Separator />
      
      {/* Points earning information */}
      <div className="text-sm">
        <p className="text-muted-foreground">
          {customerName} will earn <span className="font-semibold text-green-600">{pointsToEarn} points</span> from this transaction.
        </p>
      </div>
      
      {/* Points redemption section */}
      {customerPoints > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Switch 
                id="use-points" 
                checked={usePoints} 
                onCheckedChange={onUsePointsChange}
                disabled={!hasEnoughPoints}
              />
              <Label htmlFor="use-points" className={!hasEnoughPoints ? "text-muted-foreground" : ""}>
                Use points for this purchase
              </Label>
            </div>
            <span className="text-sm">
              Available: <span className="font-semibold">{customerPoints}</span>
            </span>
          </div>
          
          {!hasEnoughPoints && (
            <p className="text-xs text-muted-foreground">
              Minimum {minRedemptionPoints} points required for redemption.
            </p>
          )}
          
          {usePoints && hasEnoughPoints && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Points to redeem</span>
                  <span>{pointsToRedeem}</span>
                </div>
                <Slider
                  value={[pointsToRedeem]}
                  max={maxPointsToRedeem}
                  min={minRedemptionPoints}
                  step={1}
                  onValueChange={handleSliderChange}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{minRedemptionPoints}</span>
                  <span>{maxPointsToRedeem}</span>
                </div>
              </div>
              
              <div className="text-sm text-green-600 font-medium">
                Discount: {formatCurrency(pointsToRedeem * pointValue)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
