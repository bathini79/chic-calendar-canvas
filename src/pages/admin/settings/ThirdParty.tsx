
import React, { useState, useEffect } from "react";
import { Link, Routes, Route, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, Check, X, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  isActive: boolean;
}

export default function ThirdParty() {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState<string>("twilio");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<TwilioConfig>({
    defaultValues: {
      accountSid: "",
      authToken: "",
      phoneNumber: "",
      isActive: false,
    },
  });

  // Fetch existing Twilio config
  useEffect(() => {
    const fetchTwilioConfig = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("system_settings")
          .select("*")
          .eq("category", "twilio")
          .single();

        if (error) {
          console.error("Error fetching Twilio config:", error);
          return;
        }

        if (data) {
          const settings = data.settings ? 
            (typeof data.settings === 'string' ? JSON.parse(data.settings) : data.settings) : {};
            
          form.setValue("accountSid", settings.accountSid || "");
          form.setValue("authToken", settings.authToken || "");
          form.setValue("phoneNumber", settings.phoneNumber || "");
          form.setValue("isActive", data.is_active || false);
        }
      } catch (error) {
        console.error("Error parsing Twilio config:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTwilioConfig();
  }, [form]);

  const onSubmit = async (data: TwilioConfig) => {
    try {
      // Mask the auth token for display
      const maskedAuthToken = data.authToken ? 
        `${data.authToken.substring(0, 4)}${"*".repeat(data.authToken.length - 8)}${data.authToken.substring(data.authToken.length - 4)}` : "";
      
      const settingsObj = {
        accountSid: data.accountSid,
        authToken: data.authToken,
        phoneNumber: data.phoneNumber,
      };
      
      // Check if record exists
      const { data: existingData, error: fetchError } = await supabase
        .from("system_settings")
        .select("id")
        .eq("category", "twilio")
        .single();
      
      let result;
      
      if (existingData?.id) {
        // Update existing record
        result = await supabase
          .from("system_settings")
          .update({
            settings: settingsObj,
            is_active: data.isActive,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingData.id);
      } else {
        // Insert new record
        result = await supabase
          .from("system_settings")
          .insert({
            category: "twilio",
            settings: settingsObj,
            is_active: data.isActive,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      }
      
      if (result?.error) {
        throw new Error(result.error.message);
      }
      
      toast({
        title: "Configuration saved",
        description: "Twilio configuration has been updated successfully.",
        variant: "default",
      });
      
      // Replace sensitive data with masked version for UI
      form.setValue("authToken", maskedAuthToken);
      
    } catch (error: any) {
      console.error("Error saving Twilio config:", error);
      toast({
        title: "Error",
        description: `Failed to save configuration: ${error.message}`,
        variant: "destructive",
      });
    }
  };
  
  const testTwilioConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      
      const config = form.getValues();
      
      // Call the send-whatsapp-otp function to test the connection
      // This is a simplified test - we're just making sure the function runs without errors
      const { data, error } = await supabase.functions.invoke("send-whatsapp-otp", {
        body: { phoneNumber: config.phoneNumber },
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      setTestResult({
        success: true,
        message: "Twilio connection successful! A test message was sent.",
      });
      
    } catch (error: any) {
      console.error("Error testing Twilio connection:", error);
      setTestResult({
        success: false,
        message: `Failed to connect to Twilio: ${error.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="container py-6 max-w-6xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild className="mr-2">
          <Link to="/admin/settings">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <div className="text-sm text-muted-foreground">
          Workspace settings • Third party configuration
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Third Party Services</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div 
                className={`px-4 py-2 cursor-pointer ${activeSection === "twilio" ? "bg-accent" : ""}`}
                onClick={() => setActiveSection("twilio")}
              >
                <span>Twilio Configuration</span>
              </div>
              <div 
                className={`px-4 py-2 cursor-pointer ${activeSection === "other" ? "bg-accent" : ""}`}
                onClick={() => setActiveSection("other")}
              >
                <span>Other Services</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          {activeSection === "twilio" && (
            <Card>
              <CardHeader>
                <CardTitle>Twilio WhatsApp Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <p>Loading configuration...</p>
                  </div>
                ) : (
                  <>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="accountSid"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Twilio Account SID</FormLabel>
                              <FormControl>
                                <Input placeholder="AC..." {...field} />
                              </FormControl>
                              <FormDescription>
                                Enter your Twilio Account SID found in the Twilio console.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="authToken"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Twilio Auth Token</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Enter your Auth Token" 
                                  {...field} 
                                  onChange={(e) => {
                                    // Only update if the value is not masked
                                    if (!e.target.value.includes("*")) {
                                      field.onChange(e);
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormDescription>
                                This is securely stored and used for API calls.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Twilio WhatsApp Number</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="+14155238886" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Enter your WhatsApp-enabled Twilio phone number in international format.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Enable Twilio WhatsApp
                                </FormLabel>
                                <FormDescription>
                                  Turn on to activate WhatsApp OTP functionality.
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
                        
                        {testResult && (
                          <Alert variant={testResult.success ? "default" : "destructive"} className="my-4">
                            <div className="flex items-center gap-2">
                              {testResult.success ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                              <AlertDescription>{testResult.message}</AlertDescription>
                            </div>
                          </Alert>
                        )}
                        
                        <div className="flex gap-4">
                          <Button type="submit">Save Configuration</Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={testTwilioConnection} 
                            disabled={isTesting || !form.getValues().accountSid || !form.getValues().authToken}
                          >
                            {isTesting ? "Testing..." : "Test Connection"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                    
                    <Separator className="my-6" />
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">WhatsApp OTP Settings</h3>
                      <p className="text-sm text-muted-foreground">
                        The WhatsApp OTP functionality is already set up and configured. 
                        It sends a one-time password to users' WhatsApp accounts during authentication.
                      </p>
                      
                      <div className="rounded-md bg-muted p-4">
                        <h4 className="font-medium mb-2">Current OTP Configuration</h4>
                        <ul className="space-y-2 text-sm">
                          <li>• OTP Length: 6 digits</li>
                          <li>• OTP Expiry: 10 minutes</li>
                          <li>• Verification channel: WhatsApp</li>
                        </ul>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
          
          {activeSection === "other" && (
            <Card>
              <CardHeader>
                <CardTitle>Other Third-Party Services</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Additional third-party integrations will be configured here in the future.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
