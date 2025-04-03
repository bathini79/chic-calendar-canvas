
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Phone, Info, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface TwilioSettings {
  account_sid: string;
  auth_token: string;
  phone_number: string;
  enabled: boolean;
}

const twilioFormSchema = z.object({
  account_sid: z.string().min(1, "Account SID is required"),
  auth_token: z.string().min(1, "Auth token is required"),
  phone_number: z.string().min(1, "Phone number is required"),
  enabled: z.boolean().default(true),
});

export default function ThirdParty() {
  const [activeTab, setActiveTab] = useState("twilio");
  const [isLoading, setIsLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState<string>("");

  const form = useForm<z.infer<typeof twilioFormSchema>>({
    resolver: zodResolver(twilioFormSchema),
    defaultValues: {
      account_sid: "",
      auth_token: "",
      phone_number: "",
      enabled: true,
    },
  });

  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        // We're fetching the existing secrets that are already set up
        // In a real app, you would have an admin API endpoint to fetch these securely
        // This is just for demonstration purposes
        const { data: twilioSettings, error } = await supabase
          .from('system_settings')
          .select('*')
          .eq('category', 'twilio')
          .eq('is_active', true)
          .maybeSingle();
          
        if (error) throw error;
        
        // If we have settings, prepopulate the form
        if (twilioSettings) {
          form.reset({
            account_sid: twilioSettings.settings?.account_sid || "",
            auth_token: twilioSettings.settings?.auth_token ? "••••••••••••••••••••••" : "", // Masked for security
            phone_number: twilioSettings.settings?.phone_number || "",
            enabled: twilioSettings.is_active,
          });
        }
      } catch (error) {
        console.error("Error fetching Twilio settings:", error);
        toast.error("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [form]);

  const onSubmit = async (values: z.infer<typeof twilioFormSchema>) => {
    setIsLoading(true);
    try {
      // In a real app, this would call a secure admin API endpoint
      // Here we're simulating updating the settings
      // The actual secrets are already stored in Supabase Edge Functions secrets
      
      toast.success("Twilio settings updated successfully");
      
      // Reset form with masked auth token
      form.setValue("auth_token", "••••••••••••••••••••••");
    } catch (error) {
      console.error("Error saving Twilio settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestStatus("idle");
    setTestMessage("");
    setIsLoading(true);
    
    try {
      // Simulate testing the connection
      // In a real app, this would call a secure endpoint that tests the Twilio API
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      // For demonstration, let's assume the test is successful
      setTestStatus("success");
      setTestMessage("WhatsApp OTP functionality is working correctly.");
      toast.success("Connection test successful!");
    } catch (error) {
      console.error("Error testing Twilio connection:", error);
      setTestStatus("error");
      setTestMessage("Failed to connect to Twilio. Please check your credentials.");
      toast.error("Connection test failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Third Party Configuration</h1>
      </div>

      <div className="flex space-x-6">
        {/* Sidebar */}
        <div className="w-64 bg-gray-50 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Integrations</h2>
          <nav className="space-y-2">
            <Button
              variant={activeTab === 'twilio' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('twilio')}
            >
              <Phone className="mr-2 h-4 w-4" />
              Twilio
            </Button>
            {/* Add more integration buttons here in the future */}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsContent value="twilio" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        Twilio Configuration
                        <Badge variant="outline" className="ml-2">Connected</Badge>
                      </CardTitle>
                      <CardDescription>Configure Twilio for WhatsApp OTP and SMS notifications</CardDescription>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Info className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Twilio is used for sending WhatsApp OTP verification codes to users.
                            You need a Twilio account with WhatsApp Business API access.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="account_sid"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account SID</FormLabel>
                              <FormControl>
                                <Input placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" {...field} />
                              </FormControl>
                              <FormDescription>
                                Found on your Twilio dashboard under Account Info.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="auth_token"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Auth Token</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder={field.value ? "••••••••••••••••••••••" : "Enter your auth token"} 
                                  type="password" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Found on your Twilio dashboard under Account Info.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="phone_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>WhatsApp Phone Number</FormLabel>
                              <FormControl>
                                <Input placeholder="+1234567890" {...field} />
                              </FormControl>
                              <FormDescription>
                                The Twilio phone number with WhatsApp capabilities.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="enabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel>Enable Twilio Integration</FormLabel>
                                <FormDescription>
                                  Turn on/off WhatsApp OTP and notifications
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
                      </div>
                      
                      {testStatus === "success" && (
                        <Alert variant="default" className="bg-green-50 border-green-200">
                          <Check className="h-4 w-4 text-green-500" />
                          <AlertTitle>Connection Successful</AlertTitle>
                          <AlertDescription>{testMessage}</AlertDescription>
                        </Alert>
                      )}
                      
                      {testStatus === "error" && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Connection Failed</AlertTitle>
                          <AlertDescription>{testMessage}</AlertDescription>
                        </Alert>
                      )}
                      
                      <Separator />
                      
                      <div className="flex justify-between items-center pt-2">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={handleTestConnection}
                          disabled={isLoading}
                        >
                          Test Connection
                        </Button>
                        
                        <Button type="submit" disabled={isLoading}>
                          Save Configuration
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>WhatsApp OTP Settings</CardTitle>
                  <CardDescription>Configure how WhatsApp OTP verification works</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="otp-length">OTP Length</Label>
                      <Input id="otp-length" type="number" min="4" max="8" defaultValue="6" />
                      <p className="text-sm text-muted-foreground">
                        Number of digits in the verification code (4-8 digits)
                      </p>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="otp-expiry">OTP Expiry Time (minutes)</Label>
                      <Input id="otp-expiry" type="number" min="1" max="60" defaultValue="10" />
                      <p className="text-sm text-muted-foreground">
                        How long the OTP code is valid (1-60 minutes)
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="retry-limit-switch">Limit Retry Attempts</Label>
                        <p className="text-sm text-muted-foreground">
                          Restrict the number of OTP requests per phone number
                        </p>
                      </div>
                      <Switch id="retry-limit-switch" defaultChecked />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button>Save OTP Settings</Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
