
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function GupshupConfig() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [appId, setAppId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [sourceMobile, setSourceMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { toast } = useToast();

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
        .maybeSingle(); // Using maybeSingle instead of single to handle the no rows case

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "no rows returned" error
        throw error;
      }

      if (data) {
        setIsActive(data.is_active);
        const config = data.configuration || {};
        setAppId(config.app_id || "");
        setApiKey(config.api_key || "");
        setSourceMobile(config.source_mobile || "");
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
        channel: "whatsapp"
      };

      // Check if record exists
      const { data: existingData } = await supabase
        .from("messaging_providers")
        .select("id")
        .eq("provider_name", "gupshup")
        .maybeSingle(); // Using maybeSingle to handle when no record exists

      let result;
      
      if (existingData) {
        // Update existing record
        result = await supabase
          .from("messaging_providers")
          .update({
            is_active: isActive,
            configuration
          })
          .eq("provider_name", "gupshup");
      } else {
        // Insert new record
        result = await supabase
          .from("messaging_providers")
          .insert({
            provider_name: "gupshup",
            is_active: isActive,
            configuration
          });
      }

      if (result.error) throw result.error;

      toast({
        title: "Configuration saved",
        description: "GupShup settings have been updated successfully.",
      });
      
      setSaveSuccess(true);
      
      // Reset after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      
    } catch (error: any) {
      console.error("Error saving GupShup config:", error);
      setError(error.message || "Failed to save configuration");
      toast({
        title: "Error",
        description: "Failed to save GupShup configuration",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
              Enter the phone number in format: 917834811114 (country code without + symbol)
            </p>
          </div>
        </CardContent>
        <CardFooter>
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
        </CardFooter>
      </form>
    </Card>
  );
}
