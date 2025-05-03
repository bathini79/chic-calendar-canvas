import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Info, Loader2, MessageSquare, Phone, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function TwoFactorConfig() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [senderId, setSenderId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [isOtpProvider, setIsOtpProvider] = useState(false);
  const [preferWhatsappForOtp, setPreferWhatsappForOtp] = useState(true);

  useEffect(() => {
    fetchTwoFactorConfig();
    fetchMetaWhatsappConfig();
  }, []);

  const fetchMetaWhatsappConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("messaging_providers")
        .select("is_otp_provider")
        .eq("provider_name", "meta_whatsapp")
        .single();

      if (!error && data) {
        // If meta_whatsapp is the OTP provider, then we're preferring WhatsApp for OTP
        setPreferWhatsappForOtp(data.is_otp_provider);
      }
    } catch (error) {
      console.error("Error fetching WhatsApp config:", error);
    }
  };

  const fetchTwoFactorConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("messaging_providers")
        .select("*")
        .eq("provider_name", "twofactor")
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setIsActive(data.is_active);
        setIsDefault(data.is_default || false);
        setIsOtpProvider(data.is_otp_provider || false);
        const config = data.configuration || {};
        setApiKey(config.api_key || "");
        setSenderId(config.sender_id || "");
        setTemplateName(config.template_name || "");
        
        // If twofactor is the OTP provider, then we're not preferring WhatsApp for OTP
        if (data.is_otp_provider) {
          setPreferWhatsappForOtp(false);
        }
      }
    } catch (error: any) {
      console.error("Error fetching 2Factor.in config:", error);
      setError("Failed to load 2Factor.in configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const saveTwoFactorConfig = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      setError(null);

      const configuration = {
        api_key: apiKey,
        sender_id: senderId,
        template_name: templateName,
      };

      const { data: existingData } = await supabase
        .from("messaging_providers")
        .select("id")
        .eq("provider_name", "twofactor")
        .maybeSingle();

      // Update the OTP provider setting based on user preference
      const useWhatsAppForOtp = preferWhatsappForOtp;

      let result;
      if (existingData) {
        result = await supabase
          .from("messaging_providers")
          .update({
            is_active: isActive,
            is_default: isDefault,
            is_otp_provider: !useWhatsAppForOtp, // 2Factor.in is OTP provider if WhatsApp is not preferred
            configuration: configuration,
          })
          .eq("id", existingData.id);
      } else {
        result = await supabase
          .from("messaging_providers")
          .insert({
            provider_name: "twofactor",
            is_active: isActive,
            is_default: isDefault,
            is_otp_provider: !useWhatsAppForOtp,
            configuration,
          });
      }

      if (result.error) throw result.error;

      // If this provider is set as default, update other providers to not be default
      if (isDefault) {
        await supabase
          .from("messaging_providers")
          .update({ is_default: false })
          .neq("provider_name", "twofactor");
      }

      // Update the WhatsApp provider's OTP status to the opposite of twofactor's status
      await supabase
        .from("messaging_providers")
        .update({ is_otp_provider: useWhatsAppForOtp })
        .eq("provider_name", "meta_whatsapp");

      toast.success("Configuration saved", {
        description: "2Factor.in SMS settings have been updated successfully.",
      });

      setSaveSuccess(true);

      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error("Error saving 2Factor.in config:", error);
      setError(error.message || "Failed to save configuration");
      toast.error("Error", {
        description: "Failed to save 2Factor.in configuration",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testTwoFactorConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      setError(null);

      if (!testPhoneNumber) {
        throw new Error("Please enter a test phone number");
      }

      // Format the phone number for 2Factor.in (removing + if present)
      const formattedPhone = testPhoneNumber.startsWith('+') ? 
        testPhoneNumber.slice(1) : testPhoneNumber;

      // Generate a test OTP code
      const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Construct the API URL for OTP delivery
      let apiUrl;
      if (templateName) {
        apiUrl = `https://2factor.in/API/V1/${apiKey}/SMS/${formattedPhone}/${testOtp}/${templateName}`;
      } else {
        apiUrl = `https://2factor.in/API/V1/${apiKey}/SMS/${formattedPhone}/${testOtp}`;
      }

      // Make the API call
      const response = await fetch(apiUrl);
      const result = await response.json();

      if (response.ok && result.Status === "Success") {
        setTestResult(
          `Message sent successfully! Session ID: ${result.Details}`
        );
        toast.success("Success", {
          description: `Test OTP sent successfully: ${testOtp}`,
        });
      } else {
        throw new Error(result.Details || "API returned unsuccessful status");
      }
    } catch (error: any) {
      console.error("Error testing 2Factor.in connection:", error);
      setTestResult("Failed to send message");
      setError(error.message || "Failed to test connection");
      toast.error("Error", {
        description: "Failed to send test message",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveTwoFactorConfig();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-24" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>2Factor.in SMS Configuration</CardTitle>
        <CardDescription>
          Configure 2Factor.in for OTP and SMS delivery
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center space-x-2 mb-6">
            <Switch
              id="twofactor-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="twofactor-active">Enable 2Factor.in SMS Integration</Label>
          </div>

          <div className="flex items-center space-x-2 mb-6">
            <Switch
              id="twofactor-default"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
            <Label htmlFor="twofactor-default">Set as default messaging provider</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="2Factor.in API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Available in your 2Factor.in dashboard under API Key section
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sender-id" className="flex items-center">
              Sender ID
              <Info
                className="inline-block ml-1 h-4 w-4 text-muted-foreground cursor-help"
                aria-label="6-digit alphanumeric sender ID (e.g. SALON1)"
              />
            </Label>
            <Input
              id="sender-id"
              placeholder="SALON1"
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              6-character alphanumeric sender ID approved by 2Factor.in
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-name" className="flex items-center">
              Template Name (Optional)
              <Info
                className="inline-block ml-1 h-4 w-4 text-muted-foreground cursor-help"
                aria-label="DLT approved template name for OTP SMS"
              />
            </Label>
            <Input
              id="template-name"
              placeholder="OTP_TEMPLATE"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              DLT approved template name for OTP messages (leave blank for default OTP template)
            </p>
          </div>

          {/* OTP verification method preference */}
          <div className="space-y-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-md font-medium">Default OTP Verification Method</h3>
            <p className="text-xs text-muted-foreground">
              Select the default method for delivering one-time verification codes to customers
            </p>
            
            <RadioGroup 
              value={preferWhatsappForOtp ? "whatsapp" : "sms"} 
              onValueChange={(value) => setPreferWhatsappForOtp(value === "whatsapp")}
              className="flex flex-col space-y-3 mt-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="whatsapp" id="otp-whatsapp" />
                <Label htmlFor="otp-whatsapp" className="flex items-center">
                  <MessageSquare className="mr-2 h-4 w-4" /> 
                  WhatsApp (with SMS fallback)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sms" id="otp-sms" />
                <Label htmlFor="otp-sms" className="flex items-center">
                  <Phone className="mr-2 h-4 w-4" /> 
                  SMS Only
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Label htmlFor="test-phone-number">Test Phone Number</Label>
            <Input
              id="test-phone-number"
              placeholder="Enter phone number (e.g. 9198765432XX)"
              value={testPhoneNumber}
              onChange={(e) => setTestPhoneNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the phone number with country code but without + symbol (e.g. 919876543210)
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
              </>
            ) : saveSuccess ? (
              <>
                <Check className="mr-2 h-4 w-4" /> Saved
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Save Configuration
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={testTwoFactorConnection}
            disabled={isTesting || !apiKey || !senderId || !testPhoneNumber}
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing
              </>
            ) : (
              "Test Connection"
            )}
          </Button>
        </CardFooter>
        {testResult && (
          <p
            className={`mt-4 text-sm px-6 pb-4 ${
              testResult.includes("successfully")
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {testResult}
          </p>
        )}
      </form>
    </Card>
  );
}