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

export function GupshupConfig() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [appId, setAppId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [sourceMobile, setSourceMobile] = useState("");
  const [appName, setAppName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    fetchGupshupConfig();
  }, []);

  const fetchGupshupConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("messaging_providers")
        .select("*")
        .eq("provider_name", "gupshup")
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setIsActive(data.is_active);
        const config = data.configuration || {};
        setAppId(config.app_id || "");
        setApiKey(config.api_key || "");
        setSourceMobile(config.source_mobile || "");
        setAppName(config.app_name || "");
      }
    } catch (error: any) {
      console.error("Error fetching GupShup config:", error);
      setError("Failed to load GupShup configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const saveGupshupConfig = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      setError(null);

      const configuration = {
        app_id: appId,
        api_key: apiKey,
        source_mobile: sourceMobile,
        app_name: appName,
        channel: "whatsapp",
      };

      const { data: existingData } = await supabase
        .from("messaging_providers")
        .select("id")
        .eq("provider_name", "gupshup")
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
            provider_name: "gupshup",
            is_active: isActive,
            configuration,
          });
      }

      if (result.error) throw result.error;

      toast.success("Configuration saved", {
        description: "GupShup settings have been updated successfully.",
      });

      setSaveSuccess(true);

      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error("Error saving GupShup config:", error);
      setError(error.message || "Failed to save configuration");
      toast.error("Error", {
        description: "Failed to save GupShup configuration",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testGupshupConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      setError(null);

      const response = await fetch("https://api.gupshup.io/wa/api/v1/msg", {
        method: "POST",
        headers: {
          "Cache-Control": "no-cache",
          "Content-Type": "application/x-www-form-urlencoded",
          apikey: apiKey,
        },
        body: new URLSearchParams({
          channel: "whatsapp",
          source: sourceMobile,
          destination: testPhoneNumber,
          message: JSON.stringify({
            type: "text",
            text: "Test message from GupShup",
          }),
          "src.name": "TestApp",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to connect to Gupshup API");
      }

      const result = await response.json();
      if (result.status === "submitted") {
        setTestResult(
          `Message sent successfully! Message ID: ${result.messageId}`
        );
        toast.success("Success", {
          description: `Message sent successfully. Message ID: ${result.messageId}`,
        });
      } else {
        throw new Error("Unexpected response from Gupshup API");
      }
    } catch (error: any) {
      console.error("Error testing GupShup connection:", error);
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
    saveGupshupConfig();
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
        <CardTitle>GupShup Configuration</CardTitle>
        <CardDescription>
          Configure GupShup for WhatsApp notifications
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
              id="gupshup-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="gupshup-active">Enable GupShup Integration</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="app-name">App Name</Label>
            <Input
              id="app-name"
              placeholder="GupShup App Name"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="app-id">App ID</Label>
            <Input
              id="app-id"
              placeholder="GupShup App ID"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="GupShup API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source-mobile" className="flex items-center">
              Source Mobile Number
              <Info
                className="inline-block ml-1 h-4 w-4 text-muted-foreground cursor-help"
                aria-label="Mobile number in format: 917834811114 (no + symbol)"
              />
            </Label>
            <Input
              id="source-mobile"
              placeholder="Mobile number (e.g. 917834811114)"
              value={sourceMobile}
              onChange={(e) => setSourceMobile(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the phone number in format: 917834811114 (country code
              without + symbol)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-phone-number">Test Phone Number</Label>
            <Input
              id="test-phone-number"
              placeholder="Enter phone number (e.g. 919876543210)"
              value={testPhoneNumber}
              onChange={(e) => setTestPhoneNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the phone number in format: 919876543210 (country code
              without + symbol)
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
            onClick={testGupshupConnection}
            disabled={isTesting || !apiKey || !sourceMobile || !testPhoneNumber}
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
            className={`mt-4 text-sm ${
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
