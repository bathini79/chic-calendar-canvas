import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useDiscountRewardUsageConfig } from "@/hooks/use-discount-reward-usage-config";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LocationSelector } from "@/components/admin/dashboard/LocationSelector";
import * as z from "zod";
import { X, Plus } from "lucide-react";

const REWARD_TYPES = [
  {
    id: "discount",
    label: "Manual Discount",
    description: "Staff can apply percentage or fixed discounts",
  },
  {
    id: "coupon",
    label: "Coupons",
    description: "Customers can enter coupon codes",
  },
  {
    id: "membership",
    label: "Membership Discounts",
    description: "Automatic discounts based on membership tier",
  },
  {
    id: "loyalty_points",
    label: "Loyalty Points",
    description: "Customers can redeem earned points",
  },
  {
    id: "referral",
    label: "Referral Program",
    description: "Customers get rewards for referrals",
  },
];

const discountRewardUsageFormSchema = z.object({
  usage_mode: z.enum(["single", "combinations"]).default("single"),
  allowed_combinations: z.array(z.array(z.string())).default([]),
  discount_enabled: z.boolean().default(true),
  coupon_enabled: z.boolean().default(true),
  membership_enabled: z.boolean().default(true),
  loyalty_points_enabled: z.boolean().default(true),
  referral_enabled: z.boolean().default(true),
});

const DiscountRewardUsage = () => {
  const [newCombination, setNewCombination] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const { toast } = useToast();

  // Fetch locations from database
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Auto-select first location if none selected
  useEffect(() => {
    if (!selectedLocationId && locations.length > 0) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  const { config, isLoading, updateConfig } =
    useDiscountRewardUsageConfig(selectedLocationId);

  const form = useForm<z.infer<typeof discountRewardUsageFormSchema>>({
    resolver: zodResolver(discountRewardUsageFormSchema),
    defaultValues: {
      usage_mode: "single",
      allowed_combinations: [],
      discount_enabled: true,
      coupon_enabled: true,
      membership_enabled: true,
      loyalty_points_enabled: true,
      referral_enabled: true,
    },
  });
  // Update form when config is loaded
  useEffect(() => {
    if (config) {
      // Map backend reward_strategy to our usage_mode
      let usageMode: "single" | "combinations" = "single";
      if (config.reward_strategy === "combinations_only") {
        usageMode = "combinations";
      }

      form.reset({
        usage_mode: usageMode,
        allowed_combinations: config.reward_combinations || [],
        discount_enabled: config.discount_enabled,
        coupon_enabled: config.coupon_enabled,
        membership_enabled: config.membership_enabled,
        loyalty_points_enabled: config.loyalty_points_enabled,
        referral_enabled: config.referral_enabled,
      });
    }
  }, [config, form]);

  const usageMode = form.watch("usage_mode");
  const allowedCombinations = form.watch("allowed_combinations");

  const addCombination = () => {
    if (newCombination.length >= 2) {
      const currentCombinations = form.getValues("allowed_combinations");

      // Check if combination already exists
      const combinationExists = currentCombinations.some(
        (combo) =>
          combo.length === newCombination.length &&
          combo.every((item) => newCombination.includes(item))
      );

      if (!combinationExists) {
        form.setValue("allowed_combinations", [
          ...currentCombinations,
          [...newCombination],
        ]);
        setNewCombination([]);
        toast({
          title: "Success",
          description: "Combination added!",
        });
      } else {
        toast({
          title: "Error",
          description: "This combination already exists!",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Error",
        description: "Please select at least 2 reward types for a combination!",
        variant: "destructive",
      });
    }
  };

  const removeCombination = (index: number) => {
    const currentCombinations = form.getValues("allowed_combinations");
    const updatedCombinations = currentCombinations.filter(
      (_, i) => i !== index
    );
    form.setValue("allowed_combinations", updatedCombinations);
    toast({
      title: "Success",
      description: "Combination removed!",
    });
  };

  const toggleRewardInNewCombination = (rewardId: string) => {
    setNewCombination((prev) =>
      prev.includes(rewardId)
        ? prev.filter((id) => id !== rewardId)
        : [...prev, rewardId]
    );
  };

  const getRewardLabel = (rewardId: string) => {
    return REWARD_TYPES.find((type) => type.id === rewardId)?.label || rewardId;
  };
  const onSubmit = async (
    values: z.infer<typeof discountRewardUsageFormSchema>
  ) => {
    // if (!updateConfig) return;

    setIsSubmitting(true);
    try {
      // Map form values to backend schema
      const updateData = {
        reward_strategy:
          values.usage_mode === "single"
            ? ("single_only" as const)
            : ("combinations_only" as const),
        max_rewards_per_booking:
          values.usage_mode === "single"
            ? 1
            : values.allowed_combinations.length > 0
            ? Math.max(
                ...values.allowed_combinations.map((combo) => combo.length)
              )
            : 1,
        reward_combinations:
          values.usage_mode === "combinations"
            ? values.allowed_combinations
            : [],
        discount_enabled: values.discount_enabled,
        coupon_enabled: values.coupon_enabled,
        membership_enabled: values.membership_enabled,
        loyalty_points_enabled: values.loyalty_points_enabled,
        referral_enabled: values.referral_enabled,
      };

      await updateConfig(updateData);

      toast({
        title: "Success",
        description: "Settings saved successfully!",
      });
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast({
        title: "Error",
        description: "Failed to save settings!",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Discount & Reward Usage
        </h2>
        <p className="text-muted-foreground mt-1">
          Choose how customers can use rewards during checkout
        </p>
      </div>

      {/* Location Selector */}
      <div className="flex items-center space-x-4">
        <div className="w-64">
          <LocationSelector
            locations={locations}
            value={selectedLocationId}
            onChange={setSelectedLocationId}
            includeAllOption={false}
          />
        </div>
      </div>

      {/* Only show form if location is selected */}
      {selectedLocationId && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="usage_mode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Reward Usage Mode</FormLabel>
                <FormControl>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="single"
                        value="single"
                        checked={field.value === "single"}
                        onChange={() => field.onChange("single")}
                        className="h-4 w-4"
                      />
                      <div>
                        <label
                          htmlFor="single"
                          className="text-sm font-medium cursor-pointer"
                        >
                          Allow Single Rewards Only
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Customers can use one type of reward at a time
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="combinations"
                        value="combinations"
                        checked={field.value === "combinations"}
                        onChange={() => field.onChange("combinations")}
                        className="h-4 w-4"
                      />
                      <div>
                        <label
                          htmlFor="combinations"
                          className="text-sm font-medium cursor-pointer"
                        >
                          Allow Reward Combinations
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Customers can use specific combinations of rewards
                          together
                        </p>
                      </div>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {usageMode === "combinations" && (
            <div>
              <h3 className="text-base font-medium mb-4">
                Configure Reward Combinations
              </h3>

              {/* Add New Combination */}
              <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
                <h4 className="font-medium">Create New Combination</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {REWARD_TYPES.map((rewardType) => (
                    <div
                      key={rewardType.id}
                      className="flex items-start space-x-3"
                    >
                      <Checkbox
                        id={`new-${rewardType.id}`}
                        checked={newCombination.includes(rewardType.id)}
                        onCheckedChange={() =>
                          toggleRewardInNewCombination(rewardType.id)
                        }
                      />
                      <div>
                        <label
                          htmlFor={`new-${rewardType.id}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {rewardType.label}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {rewardType.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {newCombination.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Preview:</span>
                    {newCombination.map((rewardId, index) => (
                      <React.Fragment key={rewardId}>
                        <Badge variant="outline">
                          {getRewardLabel(rewardId)}
                        </Badge>
                        {index < newCombination.length - 1 && (
                          <span className="text-sm">+</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  onClick={addCombination}
                  disabled={newCombination.length < 2}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Combination
                </Button>
              </div>

              {/* Existing Combinations */}
              {allowedCombinations.length > 0 && (
                <div className="space-y-3 mt-6">
                  <h4 className="font-medium">Active Combinations</h4>
                  {allowedCombinations.map((combination, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg bg-white"
                    >
                      <div className="flex items-center gap-2">
                        {combination.map((rewardId, rewardIndex) => (
                          <React.Fragment key={rewardId}>
                            <Badge variant="secondary">
                              {getRewardLabel(rewardId)}
                            </Badge>
                            {rewardIndex < combination.length - 1 && (
                              <span className="text-sm font-medium">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCombination(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {allowedCombinations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No reward combinations configured</p>
                  <p className="text-sm">
                    Create combinations above to allow customers to use multiple
                    rewards together
                  </p>
                </div>
              )}
            </div>
          )}{" "}
          <Button type="submit" disabled={isSubmitting || isLoading}>
            {isSubmitting ? "Saving..." : "Save Settings"}
          </Button>        </form>
      </Form>
      )}

      {/* Examples at the bottom */}
      <div className="border-t pt-6">
        <h3 className="font-medium mb-3">Examples:</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Single Rewards:</strong> Customer can use either a 10%
            coupon OR loyalty points, but not both together
          </p>
          <p>
            <strong>Combination "Coupon + Loyalty Points":</strong> Customer can
            use a coupon and redeem loyalty points in the same transaction
          </p>
          <p>
            <strong>Combination "Discount + Membership + Referral":</strong>{" "}
            Staff discount, membership benefits, and referral rewards can all be
            applied together
          </p>
        </div>
      </div>
    </div>
  );
};

export default DiscountRewardUsage;
