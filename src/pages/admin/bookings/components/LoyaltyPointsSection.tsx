
import React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Info, Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

export default function LoyaltyPointsSection({
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
  maxRedemptionValue
}: LoyaltyPointsSectionProps) {
  if (!isEnabled) {
    return null;
  }

  const canUsePoints = customerPoints >= minRedemptionPoints;
  const hasMaxRedemptionLimit = maxRedemptionType && maxRedemptionValue;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getMaxRedemptionLabel = () => {
    if (!maxRedemptionType || !maxRedemptionValue) return null;
    
    if (maxRedemptionType === "fixed") {
      return `Maximum ${maxRedemptionValue} points can be redeemed per transaction`;
    } else {
      return `Points can cover up to ${maxRedemptionValue}% of the total`;
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-md flex items-center">
          <Star className="h-4 w-4 mr-2 text-amber-500" />
          Loyalty Points
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2 space-y-3">
        <div className="flex justify-between text-sm">
          <span>Current Balance:</span>
          <span className="font-medium">{customerPoints} points</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span>Points to Earn:</span>
          <span className="font-medium text-green-600">+{pointsToEarn} points</span>
        </div>

        {canUsePoints && (
          <>
            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="use-points" className="cursor-pointer">Use points for this purchase</Label>
              <Switch 
                id="use-points" 
                checked={usePoints} 
                onCheckedChange={setUsePoints} 
                disabled={!canUsePoints}
              />
            </div>
            
            {usePoints && (
              <div className="space-y-3 pt-1">
                <div className="flex justify-between text-sm items-center">
                  <Label>Points to redeem: {pointsToRedeem}</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>Value: {formatCurrency(pointsDiscountAmount)}</p>
                        {hasMaxRedemptionLimit && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {getMaxRedemptionLabel()}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Slider
                  value={[pointsToRedeem]}
                  min={minRedemptionPoints}
                  max={maxPointsToRedeem}
                  step={10}
                  onValueChange={(values) => setPointsToRedeem(values[0])}
                />
                <div className="flex justify-between text-xs">
                  <span>{minRedemptionPoints}</span>
                  <span>{maxPointsToRedeem}</span>
                </div>
              </div>
            )}
          </>
        )}

        {!canUsePoints && customerPoints > 0 && (
          <div className="text-sm text-amber-600">
            You need at least {minRedemptionPoints} points to redeem.
          </div>
        )}
      </CardContent>
      
      {usePoints && pointsToRedeem > 0 && (
        <CardFooter className="pt-0">
          <div className="w-full flex justify-between text-sm font-medium">
            <span>Discount Applied:</span>
            <span className="text-green-600">-{formatCurrency(pointsDiscountAmount)}</span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
