
import { useEffect, useState } from "react";
import { checkLoyaltyBalance } from "@/utils/checkLoyaltyBalance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function LoyaltyCheck({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [loyaltyInfo, setLoyaltyInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkBalance() {
      try {
        setLoading(true);
        const result = await checkLoyaltyBalance(userId);
        setLoyaltyInfo(result);
        console.log("Loyalty check result:", result);
      } catch (err: any) {
        setError(err.message);
        console.error("Error checking loyalty:", err);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      checkBalance();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Error checking loyalty status: {error}</div>;
  }

  if (!loyaltyInfo) {
    return null;
  }

  const { balances, settings, isEligible, message } = loyaltyInfo;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loyalty Status Check</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Wallet Balance:</span>
            <span className="font-medium">{balances.wallet_balance} points</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cashback Balance:</span>
            <span className="font-medium">{balances.cashback_balance} points</span>
          </div>
        </div>
        <div className="text-sm">
          <div className={isEligible ? "text-green-600" : "text-yellow-600"}>
            {message}
          </div>
          {settings.enabled && (
            <div className="mt-2 text-muted-foreground">
              Each point is worth ₹{settings.point_value.toFixed(2)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
