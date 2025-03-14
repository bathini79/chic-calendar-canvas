
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type LoyaltyProgramFormValues = {
  enabled: boolean;
  points_validity_days: number;
  cashback_validity_days: number;
  point_value: number;
  min_redemption_points: number;
  apply_to_all: boolean;
  points_per_spend: number;
  min_billing_amount: number;
};

export default function LoyaltyProgram() {
  const { data: loyaltyProgram, isLoading, create, update } = useSupabaseCrud('loyalty_program_settings');
  const [isSaving, setIsSaving] = React.useState(false);
  
  const form = useForm<LoyaltyProgramFormValues>({
    defaultValues: {
      enabled: true,
      points_validity_days: 365,
      cashback_validity_days: 90,
      point_value: 0.25,
      min_redemption_points: 100,
      apply_to_all: true,
      points_per_spend: 1,
      min_billing_amount: 500
    }
  });

  React.useEffect(() => {
    if (loyaltyProgram && loyaltyProgram.length > 0) {
      const settings = loyaltyProgram[0];
      form.reset({
        enabled: settings.enabled,
        points_validity_days: settings.points_validity_days,
        cashback_validity_days: settings.cashback_validity_days,
        point_value: settings.point_value,
        min_redemption_points: settings.min_redemption_points,
        apply_to_all: settings.apply_to_all,
        points_per_spend: settings.points_per_spend,
        min_billing_amount: settings.min_billing_amount
      });
    }
  }, [loyaltyProgram, form]);

  const onSubmit = async (data: LoyaltyProgramFormValues) => {
    try {
      setIsSaving(true);
      if (loyaltyProgram && loyaltyProgram.length > 0) {
        await update(loyaltyProgram[0].id, data);
        toast.success("Loyalty program settings updated");
      } else {
        await create(data);
        toast.success("Loyalty program settings created");
      }
    } catch (error) {
      console.error("Error saving loyalty program settings:", error);
      toast.error("Failed to save loyalty program settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p>Loading loyalty program settings...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Loyalty Program</h1>
        <p className="text-muted-foreground">Configure your customer loyalty and rewards system</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Loyalty Program</FormLabel>
                      <FormDescription>
                        Turn on to activate loyalty rewards for your customers
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Separator />

              <div className="space-y-6">
                <h3 className="text-lg font-medium">Points and Validity</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="points_validity_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loyalty Points Validity (Days)</FormLabel>
                        <FormDescription>
                          Number of days before earned points expire
                        </FormDescription>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cashback_validity_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cashback Validity (Days)</FormLabel>
                        <FormDescription>
                          Number of days before cashback credits expire
                        </FormDescription>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="point_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Point Value (₹)</FormLabel>
                        <FormDescription>
                          Monetary value of each loyalty point
                        </FormDescription>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={0.01} 
                            step={0.01} 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="min_redemption_points"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Redemption Points</FormLabel>
                        <FormDescription>
                          Minimum points needed for redemption
                        </FormDescription>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={0} 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-6">
                <h3 className="text-lg font-medium">Earning Settings</h3>
                
                <FormField
                  control={form.control}
                  name="apply_to_all"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Apply to all Services & Packages</FormLabel>
                        <FormDescription>
                          Turn off to select specific services or packages
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="points_per_spend"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Points per Spend (₹100)</FormLabel>
                        <FormDescription>
                          Points earned per ₹100 spent
                        </FormDescription>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={0} 
                            step={0.1} 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="min_billing_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Billing Amount (₹)</FormLabel>
                        <FormDescription>
                          Minimum purchase to earn points
                        </FormDescription>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={0} 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Settings
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
