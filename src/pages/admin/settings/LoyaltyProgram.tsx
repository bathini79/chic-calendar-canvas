
import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CalendarDays, Coins, DollarSign, Heart, Info, Save, Star } from "lucide-react";
import { useLoyaltyProgram, type LoyaltyProgramFormValues } from "@/hooks/use-loyalty-program";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

const loyaltyProgramSchema = z.object({
  enabled: z.boolean().default(false),
  points_validity_days: z.coerce.number().min(1, "Points validity must be a positive number").nullable(),
  cashback_validity_days: z.coerce.number().min(1, "Cashback validity must be a positive number").nullable(),
  point_value: z.coerce.number().min(0.01, "Point value must be at least 0.01"),
  min_redemption_points: z.coerce.number().min(1, "Minimum redemption points must be a positive number"),
  apply_to_all: z.boolean().default(true),
  points_per_spend: z.coerce.number().min(1, "Points per spend must be a positive number"),
  min_billing_amount: z.coerce.number().min(0, "Minimum billing amount must be a non-negative number").nullable(),
  applicable_services: z.array(z.string()).default([]),
  applicable_packages: z.array(z.string()).default([]),
});

export default function LoyaltyProgram() {
  const { toast } = useToast();
  const { settings, isLoading, fetchSettings, updateSettings } = useLoyaltyProgram();
  const [services, setServices] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [showServicesDialog, setShowServicesDialog] = useState(false);
  const [showPackagesDialog, setShowPackagesDialog] = useState(false);

  const form = useForm<z.infer<typeof loyaltyProgramSchema>>({
    resolver: zodResolver(loyaltyProgramSchema),
    defaultValues: {
      enabled: false,
      points_validity_days: 365,
      cashback_validity_days: 180,
      point_value: 0.01,
      min_redemption_points: 100,
      apply_to_all: true,
      points_per_spend: 1,
      min_billing_amount: 0,
      applicable_services: [],
      applicable_packages: [],
    },
  });

  useEffect(() => {
    fetchSettings();
    fetchServices();
    fetchPackages();
  }, []);

  useEffect(() => {
    if (settings) {
      setSelectedServices(settings.applicable_services || []);
      setSelectedPackages(settings.applicable_packages || []);
      
      form.reset({
        enabled: settings.enabled,
        points_validity_days: settings.points_validity_days,
        cashback_validity_days: settings.cashback_validity_days,
        point_value: settings.point_value,
        min_redemption_points: settings.min_redemption_points,
        apply_to_all: settings.apply_to_all,
        points_per_spend: settings.points_per_spend,
        min_billing_amount: settings.min_billing_amount,
        applicable_services: settings.applicable_services || [],
        applicable_packages: settings.applicable_packages || [],
      });
    }
  }, [settings]);

  const fetchServices = async () => {
    const { data } = await supabase.from("services").select("id, name, selling_price").order("name");
    if (data) {
      setServices(data);
    }
  };

  const fetchPackages = async () => {
    const { data } = await supabase.from("packages").select("id, name, price").order("name");
    if (data) {
      setPackages(data);
    }
  };

  const onSubmit = async (values: z.infer<typeof loyaltyProgramSchema>) => {
    // Update values with selected services and packages
    values.applicable_services = selectedServices;
    values.applicable_packages = selectedPackages;
    
    // Only include applicable_services and applicable_packages if apply_to_all is false
    if (values.apply_to_all) {
      values.applicable_services = [];
      values.applicable_packages = [];
    }
    
    try {
      await updateSettings(values as LoyaltyProgramFormValues);
      toast({
        title: "Success",
        description: "Loyalty program settings saved successfully",
        variant: "default",
      });
    } catch (error) {
      console.error("Error saving loyalty program settings:", error);
      toast({
        title: "Error",
        description: "Failed to save loyalty program settings",
        variant: "destructive",
      });
    }
  };

  const handleServiceSelection = (serviceId: string) => {
    setSelectedServices(current => {
      if (current.includes(serviceId)) {
        return current.filter(id => id !== serviceId);
      } else {
        return [...current, serviceId];
      }
    });
  };

  const handlePackageSelection = (packageId: string) => {
    setSelectedPackages(current => {
      if (current.includes(packageId)) {
        return current.filter(id => id !== packageId);
      } else {
        return [...current, packageId];
      }
    });
  };

  if (isLoading) {
    return <div className="container py-6">Loading loyalty program settings...</div>;
  }

  // Watch for changes to apply_to_all to show/hide dialogs appropriately
  const applyToAll = form.watch("apply_to_all");

  return (
    <TooltipProvider>
      <div className="container py-6">
        <h1 className="text-2xl font-bold mb-6">Loyalty Program Settings</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="mr-2 h-5 w-5 text-yellow-500" />
              Loyalty Program Configuration
            </CardTitle>
            <CardDescription>
              Configure how your loyalty program works for your customers
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                          Turn on the loyalty program for your customers
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
                  <div className="space-y-6">
                    <div className="flex items-center mb-2">
                      <Coins className="mr-2 h-5 w-5 text-primary" />
                      <h3 className="text-lg font-medium">Points Configuration</h3>
                    </div>
                  
                    <FormField
                      control={form.control}
                      name="points_per_spend"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center space-x-2">
                            <FormLabel>Points Per Spend (₹)</FormLabel>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Number of points awarded for every ₹1 spent by customers</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="point_value"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center space-x-2">
                            <FormLabel>Point Value (₹)</FormLabel>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">The monetary value of each loyalty point when redeemed</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
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
                          <div className="flex items-center space-x-2">
                            <FormLabel>Minimum Redemption Points</FormLabel>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Minimum points required before a customer can redeem them</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex items-center mb-2">
                      <CalendarDays className="mr-2 h-5 w-5 text-primary" />
                      <h3 className="text-lg font-medium">Validity Configuration</h3>
                    </div>
                  
                    <FormField
                      control={form.control}
                      name="points_validity_days"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center space-x-2">
                            <FormLabel>Points Validity (Days)</FormLabel>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Number of days before points expire. Leave empty for no expiration.</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              value={field.value === null ? "" : field.value}
                              onChange={(e) => {
                                field.onChange(e.target.value === "" ? null : Number(e.target.value));
                              }}
                            />
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
                          <div className="flex items-center space-x-2">
                            <FormLabel>Cashback Validity (Days)</FormLabel>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Number of days before cashback expires. Leave empty for no expiration.</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              value={field.value === null ? "" : field.value}
                              onChange={(e) => {
                                field.onChange(e.target.value === "" ? null : Number(e.target.value));
                              }}
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
                          <div className="flex items-center space-x-2">
                            <FormLabel>Minimum Billing Amount (₹)</FormLabel>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Minimum bill amount for points to be awarded. Leave empty for no minimum.</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              value={field.value === null ? "" : field.value}
                              onChange={(e) => {
                                field.onChange(e.target.value === "" ? null : Number(e.target.value));
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <Alert className="mt-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Applicability</AlertTitle>
                  <AlertDescription>
                    Choose whether to apply loyalty program to all services and packages or select specific ones.
                  </AlertDescription>
                </Alert>
                
                <FormField
                  control={form.control}
                  name="apply_to_all"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Apply to All Services & Packages</FormLabel>
                        <FormDescription>
                          Turn off to select specific services and packages
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
                
                {!applyToAll && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <FormLabel>Applicable Services</FormLabel>
                      <Dialog open={showServicesDialog} onOpenChange={setShowServicesDialog}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            type="button" 
                            className="w-full mt-2"
                          >
                            Select Services ({selectedServices.length})
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Select Services</DialogTitle>
                            <DialogDescription>
                              Choose the services that earn loyalty points.
                            </DialogDescription>
                          </DialogHeader>
                          <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                            {services.map((service) => (
                              <div key={service.id} className="flex items-center space-x-2 mb-2">
                                <Checkbox
                                  id={`service-${service.id}`}
                                  checked={selectedServices.includes(service.id)}
                                  onCheckedChange={() => handleServiceSelection(service.id)}
                                />
                                <label
                                  htmlFor={`service-${service.id}`}
                                  className="flex items-center justify-between w-full text-sm font-medium leading-none cursor-pointer"
                                >
                                  <span>{service.name}</span>
                                  <Badge variant="secondary">₹{service.selling_price}</Badge>
                                </label>
                              </div>
                            ))}
                          </ScrollArea>
                          <DialogFooter>
                            <Button type="button" onClick={() => setShowServicesDialog(false)}>
                              Done
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    <div>
                      <FormLabel>Applicable Packages</FormLabel>
                      <Dialog open={showPackagesDialog} onOpenChange={setShowPackagesDialog}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            type="button" 
                            className="w-full mt-2"
                          >
                            Select Packages ({selectedPackages.length})
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Select Packages</DialogTitle>
                            <DialogDescription>
                              Choose the packages that earn loyalty points.
                            </DialogDescription>
                          </DialogHeader>
                          <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                            {packages.map((pkg) => (
                              <div key={pkg.id} className="flex items-center space-x-2 mb-2">
                                <Checkbox
                                  id={`package-${pkg.id}`}
                                  checked={selectedPackages.includes(pkg.id)}
                                  onCheckedChange={() => handlePackageSelection(pkg.id)}
                                />
                                <label
                                  htmlFor={`package-${pkg.id}`}
                                  className="flex items-center justify-between w-full text-sm font-medium leading-none cursor-pointer"
                                >
                                  <span>{pkg.name}</span>
                                  <Badge variant="secondary">₹{pkg.price}</Badge>
                                </label>
                              </div>
                            ))}
                          </ScrollArea>
                          <DialogFooter>
                            <Button type="button" onClick={() => setShowPackagesDialog(false)}>
                              Done
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                )}
                
                <Button type="submit" className="mt-6">
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
