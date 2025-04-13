import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Info, Star, Save, Loader2 } from "lucide-react";
import { useLoyaltyProgram, LoyaltyProgramFormValues } from "@/hooks/use-loyalty-program";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  enabled: z.boolean().default(false),
  points_per_spend: z.coerce.number().min(0, "Points per spend must be a positive number"),
  min_redemption_points: z.coerce.number().min(0, "Minimum redemption must be a positive number"),
  min_billing_amount: z.coerce.number().nullable().optional(),
  points_validity_days: z.coerce.number().nullable().optional(),
  apply_to_all: z.boolean().default(true),
  applicable_services: z.array(z.string()).optional(),
  applicable_packages: z.array(z.string()).optional(),
  max_redemption_type: z.enum(["fixed", "percentage"]).nullable().optional(),
  max_redemption_points: z.coerce.number().nullable().optional(),
  max_redemption_percentage: z.coerce.number().nullable().optional(),
});

export default function LoyaltyProgram() {
  const { settings, isLoading, fetchSettings, updateSettings } = useLoyaltyProgram();
  const [services, setServices] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [showServicesSelector, setShowServicesSelector] = useState(false);
  const [showPackagesSelector, setShowPackagesSelector] = useState(false);
  const [loading,setLoading] = useState(false);
  const form = useForm<LoyaltyProgramFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      enabled: false,
      points_per_spend: 1,
      min_redemption_points: 100,
      min_billing_amount: null,
      apply_to_all: true,
      applicable_services: [],
      applicable_packages: [],
      points_validity_days: null,
      max_redemption_type: null,
      max_redemption_points: null,
      max_redemption_percentage: null,
    },
  });

  useEffect(() => {
    fetchSettings();
    fetchServicesAndPackages();
  }, []);

  useEffect(() => {
    if (settings) {
      form.reset({
        enabled: settings.enabled,
        points_per_spend: settings.points_per_spend,
        min_redemption_points: settings.min_redemption_points,
        min_billing_amount: settings.min_billing_amount,
        apply_to_all: settings.apply_to_all,
        applicable_services: settings.applicable_services || [],
        applicable_packages: settings.applicable_packages || [],
        points_validity_days: settings.points_validity_days,
        max_redemption_type: settings.max_redemption_type,
        max_redemption_points: settings.max_redemption_points,
        max_redemption_percentage: settings.max_redemption_percentage,
      });
      
      setSelectedServices(settings.applicable_services || []);
      setSelectedPackages(settings.applicable_packages || []);
    }
  }, [settings]);

  const fetchServicesAndPackages = async () => {
    const { data: servicesData } = await supabase
      .from("services")
      .select("id, name, selling_price")
      .eq("status", "active")
      .order("name");
      
    const { data: packagesData } = await supabase
      .from("packages")
      .select("id, name, price")
      .eq("status", "active")
      .order("name");
      
    if (servicesData) setServices(servicesData);
    if (packagesData) setPackages(packagesData);
  };
  
  const onSubmit = async (values: LoyaltyProgramFormValues) => {
    // Ensure we include the service and package selections
    setLoading(true);
    const dataToSubmit = {
      ...values,
      applicable_services: values.apply_to_all ? [] : selectedServices,
      applicable_packages: values.apply_to_all ? [] : selectedPackages
    };
    
    await updateSettings(dataToSubmit);
    setLoading(false)
  };
  
  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(current => 
      current.includes(serviceId) 
        ? current.filter(id => id !== serviceId) 
        : [...current, serviceId]
    );
  };
  
  const handlePackageToggle = (packageId: string) => {
    setSelectedPackages(current => 
      current.includes(packageId) 
        ? current.filter(id => id !== packageId) 
        : [...current, packageId]
    );
  };

  const maxRedemptionType = form.watch("max_redemption_type");

  return (
    <div className="container py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center">
          <Star className="mr-2 h-6 w-6 text-primary" />
          Loyalty Program
        </h1>
        <p className="text-muted-foreground">
          Configure your loyalty program settings to reward repeat customers.
        </p>
      </div>
      
      <Card className="mb-8">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <p>Loading loyalty program settings...</p>
            </div>
          ) : (
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
                          Turn on the loyalty program for your customers.
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
                        <FormLabel>
                          Points Per Spend
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 ml-1 inline cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="w-60">Number of points a customer earns for each currency unit spent.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormDescription>
                          Example: 1 point per $1 spent
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

          

                  <FormField
                    control={form.control}
                    name="min_redemption_points"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Minimum Redemption Points
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 ml-1 inline cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="w-60">Minimum number of points required for redemption.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Example: 100 points minimum
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="min_billing_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Minimum Billing Amount
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 ml-1 inline cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="w-60">Minimum purchase amount required to earn points. Leave empty for no minimum.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="No minimum" 
                            value={field.value !== null ? field.value : ''} 
                            onChange={(e) => {
                              const value = e.target.value === '' ? null : parseFloat(e.target.value);
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Example: Must spend at least $10 to earn points
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="points_validity_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                        Point Expiration After Inactivity (Days)
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 ml-1 inline cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="w-60">Points expire if no activity occurs within this time.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="No expiration" 
                            value={field.value !== null ? field.value : ''} 
                            onChange={(e) => {
                              const value = e.target.value === '' ? null : parseInt(e.target.value);
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Example: Points expire after 365 days
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

      

                  <FormField
                    control={form.control}
                    name="max_redemption_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Maximum Redemption Type
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 ml-1 inline cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="w-60">Choose how to limit maximum points redemption - by fixed points or percentage of subtotal.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <FormControl>
                          <Select 
                            value={field.value || ""} 
                            onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="No limit" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No limit</SelectItem>
                              <SelectItem value="fixed">Fixed Points</SelectItem>
                              <SelectItem value="percentage">Percentage of Subtotal</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          Set a limit on how many points can be redeemed
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {maxRedemptionType === "fixed" && (
                    <FormField
                      control={form.control}
                      name="max_redemption_points"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Maximum Redemption Points
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 ml-1 inline cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="w-60">Maximum number of points that can be redeemed per transaction.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              value={field.value !== null ? field.value : ''} 
                              onChange={(e) => {
                                const value = e.target.value === '' ? null : parseInt(e.target.value);
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Example: Maximum 1000 points per transaction
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {maxRedemptionType === "percentage" && (
                    <FormField
                      control={form.control}
                      name="max_redemption_percentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Maximum Redemption Percentage
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 ml-1 inline cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="w-60">Maximum percentage of subtotal that can be covered by points.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0"
                              max="100"
                              value={field.value !== null ? field.value : ''} 
                              onChange={(e) => {
                                const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Example: Points can cover up to 50% of the total
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="apply_to_all"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Apply to All Services & Packages</FormLabel>
                        <FormDescription>
                          Apply loyalty points to all services and packages.
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

                {!form.watch("apply_to_all") && (
                  <div className="space-y-4">
                    <Tabs defaultValue="services" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="services">Services</TabsTrigger>
                        <TabsTrigger value="packages">Packages</TabsTrigger>
                      </TabsList>
                      <TabsContent value="services" className="space-y-4 pt-4">
                        <div className="rounded-md border p-4">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-md font-medium">Selected Services: {selectedServices.length}</h3>
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setShowServicesSelector(!showServicesSelector)}
                            >
                              {showServicesSelector ? "Hide" : "Show"} Services
                            </Button>
                          </div>
                          
                          {showServicesSelector && (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {services.map(service => (
                                <div key={service.id} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`service-${service.id}`}
                                    className="h-4 w-4 rounded border-gray-300"
                                    checked={selectedServices.includes(service.id)}
                                    onChange={() => handleServiceToggle(service.id)}
                                  />
                                  <label htmlFor={`service-${service.id}`} className="flex-grow">
                                    {service.name} - ${service.selling_price}
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      <TabsContent value="packages" className="space-y-4 pt-4">
                        <div className="rounded-md border p-4">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-md font-medium">Selected Packages: {selectedPackages.length}</h3>
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setShowPackagesSelector(!showPackagesSelector)}
                            >
                              {showPackagesSelector ? "Hide" : "Show"} Packages
                            </Button>
                          </div>
                          
                          {showPackagesSelector && (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {packages.map(pkg => (
                                <div key={pkg.id} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`package-${pkg.id}`}
                                    className="h-4 w-4 rounded border-gray-300"
                                    checked={selectedPackages.includes(pkg.id)}
                                    onChange={() => handlePackageToggle(pkg.id)}
                                  />
                                  <label htmlFor={`package-${pkg.id}`} className="flex-grow">
                                    {pkg.name} - ${pkg.price}
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" className="flex items-center">
                    {loading ? <Loader2/> : 
                    <><Save className="mr-2 h-4 w-4" /><p>Save Settings</p></>}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
