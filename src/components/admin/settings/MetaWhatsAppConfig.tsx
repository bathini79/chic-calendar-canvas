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
import { Check, Info, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";

export function MetaWhatsAppConfig() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [apiVersion, setApiVersion] = useState("v18.0");
  const [verifyToken, setVerifyToken] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    fetchMetaWhatsAppConfig();
    generateWebhookUrl();
  }, []);

  const generateWebhookUrl = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-app-url");
      
      if (error) throw error;
      
      if (data?.origin) {
        setWebhookUrl(`${data.origin}/functions/v1/meta-whatsapp-webhook`);
      } else {
        setWebhookUrl("https://[your-supabase-project].supabase.co/functions/v1/meta-whatsapp-webhook");
      }
    } catch (error) {
      console.error("Error generating webhook URL:", error);
      setWebhookUrl("https://[your-supabase-project].supabase.co/functions/v1/meta-whatsapp-webhook");
    }
  };

  const fetchMetaWhatsAppConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("messaging_providers")
        .select("*")
        .eq("provider_name", "meta_whatsapp")
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setIsActive(data.is_active);
        const config = data.configuration || {};
        setPhoneNumberId(config.phone_number_id || "");
        setAccessToken(config.access_token || "");
        setBusinessAccountId(config.business_account_id || "");
        setApiVersion(config.api_version || "v18.0");
        setVerifyToken(config.verify_token || "");
      } else {
        // Generate a verify token if none exists
        setVerifyToken(generateRandomToken());
      }
    } catch (error: any) {
      console.error("Error fetching Meta WhatsApp config:", error);
      setError("Failed to load Meta WhatsApp configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomToken = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  const saveMetaWhatsAppConfig = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      setError(null);

      const configuration = {
        phone_number_id: phoneNumberId,
        access_token: accessToken,
        business_account_id: businessAccountId,
        api_version: apiVersion,
        verify_token: verifyToken,
      };

      const { data: existingData } = await supabase
        .from("messaging_providers")
        .select("id")
        .eq("provider_name", "meta_whatsapp")
        .maybeSingle();

      let result;
      if (existingData) {
        result = await supabase
          .from("messaging_providers")
          .update({
            is_active: isActive,
            configuration: configuration,
          })
          .eq("id", existingData.id);
      } else {
        result = await supabase
          .from("messaging_providers")
          .insert({
            provider_name: "meta_whatsapp",
            is_active: isActive,
            configuration,
          });
      }

      if (result.error) throw result.error;

      toast.success("Configuration saved", {
        description: "Meta WhatsApp settings have been updated successfully.",
      });

      setSaveSuccess(true);

      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error("Error saving Meta WhatsApp config:", error);
      setError(error.message || "Failed to save configuration");
      toast.error("Error", {
        description: "Failed to save Meta WhatsApp configuration",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testMetaWhatsAppConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      setError(null);

      // Prepare the message data for Meta WhatsApp Cloud API
      const messageData = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: testPhoneNumber.startsWith('+') ? testPhoneNumber : `+${testPhoneNumber}`,
        type: "text",
        text: { 
          body: "Test message from Meta WhatsApp Cloud API" 
        }
      };

      // Send message via Meta WhatsApp Cloud API
      const response = await fetch(
        `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          },
          body: JSON.stringify(messageData)
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`Meta API error: ${JSON.stringify(result)}`);
      }

      // Get the message ID from the response
      const messageId = result.messages && result.messages[0] ? result.messages[0].id : null;

      if (!messageId) {
        throw new Error('Failed to get message ID from Meta WhatsApp API response');
      }

      setTestResult(
        `Message sent successfully! Message ID: ${messageId}`
      );
      
      toast.success("Success", {
        description: `Message sent successfully. Message ID: ${messageId}`,
      });
    } catch (error: any) {
      console.error("Error testing Meta WhatsApp connection:", error);
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
    saveMetaWhatsAppConfig();
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
        <CardTitle>Meta WhatsApp Cloud API Configuration</CardTitle>
        <CardDescription>
          Configure the Meta WhatsApp Cloud API for direct WhatsApp integration
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
              id="meta-whatsapp-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="meta-whatsapp-active">Enable Meta WhatsApp Cloud API Integration</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone-number-id" className="flex items-center">
              Phone Number ID
              <Info
                className="inline-block ml-1 h-4 w-4 text-muted-foreground cursor-help"
                aria-label="Your WhatsApp Phone Number ID from the Meta Developer Dashboard"
              />
            </Label>
            <Input
              id="phone-number-id"
              placeholder="123456789012345"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Found in Meta Developer Dashboard under WhatsApp > API Setup
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="business-account-id" className="flex items-center">
              WhatsApp Business Account ID
              <Info
                className="inline-block ml-1 h-4 w-4 text-muted-foreground cursor-help"
                aria-label="Your WhatsApp Business Account ID from the Meta Developer Dashboard"
              />
            </Label>
            <Input
              id="business-account-id"
              placeholder="123456789012345"
              value={businessAccountId}
              onChange={(e) => setBusinessAccountId(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="access-token">System User Access Token</Label>
            <Input
              id="access-token"
              type="password"
              placeholder="Meta Graph API Access Token"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Permanent access token with WhatsApp messaging permissions
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-version">API Version</Label>
            <Input
              id="api-version"
              placeholder="v18.0"
              value={apiVersion}
              onChange={(e) => setApiVersion(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="verify-token">Webhook Verify Token</Label>
            <div className="flex gap-2">
              <Input
                id="verify-token"
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                required
              />
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setVerifyToken(generateRandomToken())}
              >
                Generate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Used to verify webhook endpoints from Meta
            </p>
          </div>

          <div className="space-y-2 pt-4">
            <Label>Webhook URL</Label>
            <div className="flex items-center gap-2">
              <Input
                value={webhookUrl}
                readOnly
                className="bg-muted"
              />
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl);
                  toast.success("Copied to clipboard");
                }}
              >
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Add this URL to your Meta Developer Dashboard under WhatsApp > Configuration > Webhooks
            </p>
          </div>

          <div className="space-y-2 mt-6 pt-4 border-t">
            <Label htmlFor="test-phone-number">Test Phone Number</Label>
            <Input
              id="test-phone-number"
              placeholder="Enter phone number with country code (e.g. +919876543210)"
              value={testPhoneNumber}
              onChange={(e) => setTestPhoneNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the phone number with country code (e.g. +919876543210)
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
            onClick={testMetaWhatsAppConnection}
            disabled={isTesting || !phoneNumberId || !accessToken || !testPhoneNumber}
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