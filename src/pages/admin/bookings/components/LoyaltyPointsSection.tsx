
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Award, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LoyaltyPointsSectionProps {
  isEnabled: boolean;
  customerPoints: number;
  pointsToEarn: number;
  usePoints: boolean;
  setUsePoints: (usePoints: boolean) => void;
  pointsToRedeem: number;
  setPointsToRedeem: (points: number) => void;
  maxPointsToRedeem: number;
  minRedemptionPoints: number;
  pointsDiscountAmount: number;
  pointValue: number;
  maxRedemptionType: "fixed" | "percentage" | null;
  maxRedemptionValue: number | null;
}

const LoyaltyPointsSection: React.FC<LoyaltyPointsSectionProps> = ({
  isEnabled,
  customerPoints,
  pointsToEarn,
  usePoints,
  setUsePoints,
  pointsToRedeem,
  setPointsToRedeem,
  maxPointsToRedeem,
  minRedemptionPoints,
  pointsDiscountAmount,
  pointValue,
  maxRedemptionType,
  maxRedemptionValue,
}) => {
  if (!isEnabled) {
    return null;
  }

  const canUsePoints = customerPoints >= minRedemptionPoints;
  const formatValue = (value: number) => `${Math.round(value)}`;

  const getMaxRedemptionText = () => {
    if (!maxRedemptionType) return null;
    
    return maxRedemptionType === 'fixed' 
      ? `Maximum ${maxRedemptionValue} points can be redeemed per transaction.`
      : `Maximum ${maxRedemptionValue}% of bill amount can be paid with points.`;
  };

  return (
    <Card className="border border-green-100 bg-green-50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Award className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="font-medium text-green-800">Loyalty Points</h3>
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-80">
                <p>Customers earn points for eligible purchases and can redeem them for discounts.</p>
                <p className="mt-1">Each point is worth ₹{pointValue}.</p>
                {getMaxRedemptionText() && (
                  <p className="mt-1">{getMaxRedemptionText()}</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Available Balance:</span>
            <span className="ml-1 font-semibold">{customerPoints} points</span>
          </div>
          <div>
            <span className="text-muted-foreground">Will Earn:</span>
            <span className="ml-1 font-semibold text-green-600">+{pointsToEarn} points</span>
          </div>
        </div>
        
        {customerPoints > 0 && (
          <div className="pt-2 border-t border-green-200">
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="use-points" className="cursor-pointer">
                Apply points for discount
              </Label>
              <Switch 
                id="use-points" 
                checked={usePoints}
                onCheckedChange={setUsePoints}
                disabled={!canUsePoints}
              />
            </div>
            
            {usePoints && (
              <div className="space-y-2 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Points to redeem:</span>
                  <span className="text-sm font-semibold">{pointsToRedeem}</span>
                </div>
                
                <Slider
                  value={[pointsToRedeem]}
                  min={minRedemptionPoints}
                  max={maxPointsToRedeem}
                  step={10}
                  onValueChange={(values) => setPointsToRedeem(values[0])}
                  aria-label="Points to redeem"
                />
                
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{minRedemptionPoints}</span>
                  <span>{maxPointsToRedeem}</span>
                </div>
                
                <div className="mt-1 text-sm text-green-600 font-medium">
                  Discount value: ₹{pointsDiscountAmount.toFixed(2)}
                </div>
              </div>
            )}
            
            {!canUsePoints && (
              <div className="text-xs text-muted-foreground mt-1">
                Minimum {minRedemptionPoints} points required to redeem.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LoyaltyPointsSection;
