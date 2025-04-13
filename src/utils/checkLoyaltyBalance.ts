
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export async function checkLoyaltyBalance(userId: string) {
  try {
    // Fetch user's current balances
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('wallet_balance, cashback_balance')
      .eq('id', userId)
      .single();
      
    if (userError) throw userError;
    
    // Fetch loyalty program settings
    const { data: settings, error: settingsError } = await supabase
      .from('loyalty_program_settings')
      .select('*')
      .single();
      
    if (settingsError) throw settingsError;
    
    if (!settings.enabled) {
      return {
        isEligible: false,
        message: "Loyalty program is not enabled",
        balances: userData,
        settings
      };
    }

    const isEligibleForRedemption = userData.wallet_balance >= settings.min_redemption_points;

    return {
      isEligible: isEligibleForRedemption,
      message: isEligibleForRedemption 
        ? `User can redeem points (has ${userData.wallet_balance} points, minimum required is ${settings.min_redemption_points})`
        : `User needs ${settings.min_redemption_points - userData.wallet_balance} more points to be eligible for redemption`,
      balances: userData,
      settings
    };
  } catch (error) {
    console.error("Error checking loyalty balance:", error);
    throw error;
  }
}

// Call it like this:
// const result = await checkLoyaltyBalance("user-id");
// console.log(result.isEligible, result.message);
