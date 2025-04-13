import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Award, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LoyaltyPointsSectionProps {
  isEnabled: boolean;
  walletBalance: number;
  cashbackBalance: number;
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
  walletBalance,
  cashbackBalance,
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
}) => {
  if (!isEnabled) {
    return null;
  }

  const handleSliderChange = (values: number[]) => {
    if (values.length > 0) {
      setPointsToRedeem(Math.floor(values[0]));
    }
  };

  const canUsePoints = walletBalance >= minRedemptionPoints && maxPointsToRedeem > 0;
  
  return (
    <Card className="bg-gray-50 border">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Award className="h-5 w-5 text-primary" />
            <span className="font-medium">Loyalty Points</span>
          </div>
          {pointsToEarn > 0 && (
            <span className="text-sm text-green-600">
              Will earn {pointsToEarn} points
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Available Points</span>
          <span className="font-medium">{walletBalance}</span>
        </div>

        {cashbackBalance > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Cashback Points</span>
            <span className="font-medium text-blue-600">{cashbackBalance} (auto-transferring)</span>
          </div>
        )}

        {canUsePoints ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm">Redeem Points</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-xs">
                        {maxRedemptionType === "fixed" && maxRedemptionValue
                          ? `Maximum ${maxRedemptionValue} points can be redeemed per transaction.`
                          : maxRedemptionType === "percentage" && maxRedemptionValue
                          ? `Points worth up to ${maxRedemptionValue}% of the subtotal can be redeemed.`
                          : `Redeem your points for a discount.`}
                        <br />
                        Each point is worth ₹{pointValue.toFixed(2)}.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                checked={usePoints}
                onCheckedChange={setUsePoints}
                disabled={!canUsePoints}
              />
            </div>

            {usePoints && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Points to redeem</span>
                  <span>{pointsToRedeem} points (₹{pointsDiscountAmount.toFixed(2)})</span>
                </div>
                <Slider
                  value={[pointsToRedeem]}
                  min={minRedemptionPoints}
                  max={maxPointsToRedeem}
                  step={1}
                  onValueChange={handleSliderChange}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Min: {minRedemptionPoints}</span>
                  <span>Max: {maxPointsToRedeem}</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            {walletBalance < minRedemptionPoints
              ? `Minimum ${minRedemptionPoints} points required to redeem.`
              : `Not enough points available to redeem.`}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LoyaltyPointsSection;
