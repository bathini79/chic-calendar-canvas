
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  isActive: boolean;
}

export default function ThirdParty() {
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [twilioConfig, setTwilioConfig] = useState<TwilioConfig>({
    accountSid: '',
    authToken: '',
    phoneNumber: '',
    isActive: false
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("twilio");
  const { toast } = useToast();

  useEffect(() => {
    fetchTwilioConfig();
  }, []);

  const fetchTwilioConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke(
        "get-twilio-config"
      );

      if (error) {
        console.error("Error fetching Twilio config:", error);
        setError(error.message || "Failed to fetch Twilio configuration");
        throw new Error(error.message);
      }

      if (data) {
        setTwilioConfig(data);
      }
    } catch (error: any) {
      console.error("Error fetching Twilio config:", error);
      setError("Failed to fetch Twilio configuration. Please ensure you have admin access.");
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveTwilioConfig = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Update Twilio configuration in the system_settings table
      const { data, error } = await supabase
        .from('system_settings')
        .upsert(
          {
            category: 'twilio',
            settings: {
              accountSid: twilioConfig.accountSid,
              authToken: twilioConfig.authToken,
              phoneNumber: twilioConfig.phoneNumber
            },
            is_active: twilioConfig.isActive
          },
          { onConflict: 'category' }
        );

      if (error) {
        console.error("Error saving Twilio config:", error);
        setError(error.message || "Failed to save Twilio configuration");
        throw error;
      }

      toast({
        title: "Success",
        description: "Twilio configuration saved successfully",
      });
      
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error saving Twilio config:", error);
      setError("Failed to save Twilio configuration");
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTwilioConfigChange = (field: keyof TwilioConfig, value: string | boolean) => {
    setTwilioConfig({
      ...twilioConfig,
      [field]: value
    });
  };

  const testWhatsAppConnection = async () => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-whatsapp-otp",
        {
          body: { phoneNumber: twilioConfig.phoneNumber }
        }
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: "WhatsApp test message sent successfully"
      });
    } catch (error: any) {
      console.error("Error testing WhatsApp connection:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send test message",
        variant: "destructive"
      });
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
        {/* Sidebar */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Third Party Services</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div
                className={`px-4 py-2 cursor-pointer ${
                  activeSection === "twilio" ? "bg-accent" : ""
                }`}
                onClick={() => setActiveSection("twilio")}
              >
                <span>Twilio Configuration</span>
              </div>
              <div
                className={`px-4 py-2 cursor-pointer ${
                  activeSection === "other" ? "bg-accent" : ""
                }`}
                onClick={() => setActiveSection("other")}
              >
                <span>Other Services</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="md:col-span-3">
          {activeSection === "twilio" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Twilio WhatsApp Configuration</CardTitle>
                <div className="flex space-x-2">
                  {!isEditing ? (
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                      Edit
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                      <Button onClick={saveTwilioConfig} disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save"}
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {isLoading ? (
                  <>
                    <Skeleton className="h-10 w-full mb-4 rounded-md" />
                    <div className="grid grid-cols-1 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-16 rounded-md" />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="twilio-active">Active</Label>
                        <Switch
                          id="twilio-active"
                          checked={twilioConfig.isActive}
                          onCheckedChange={(checked) => handleTwilioConfigChange('isActive', checked)}
                          disabled={!isEditing}
                        />
                      </div>
                      
                      {twilioConfig.isActive && twilioConfig.accountSid && twilioConfig.authToken && twilioConfig.phoneNumber && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={testWhatsAppConnection}
                          disabled={isSaving || isEditing}
                        >
                          Test Connection
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="account-sid">Account SID</Label>
                      <Input
                        id="account-sid"
                        value={twilioConfig.accountSid}
                        onChange={(e) => handleTwilioConfigChange('accountSid', e.target.value)}
                        disabled={!isEditing}
                        type={isEditing ? "text" : "password"}
                        placeholder="Enter Twilio Account SID"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="auth-token">Auth Token</Label>
                      <Input
                        id="auth-token"
                        value={twilioConfig.authToken}
                        onChange={(e) => handleTwilioConfigChange('authToken', e.target.value)}
                        disabled={!isEditing}
                        type={isEditing ? "text" : "password"}
                        placeholder="Enter Twilio Auth Token"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone-number">WhatsApp Phone Number</Label>
                      <Input
                        id="phone-number"
                        value={twilioConfig.phoneNumber}
                        onChange={(e) => handleTwilioConfigChange('phoneNumber', e.target.value)}
                        disabled={!isEditing}
                        placeholder="Enter Twilio Phone Number (with country code)"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Enter the phone number in E.164 format (e.g., +1234567890)
                      </p>
                    </div>

                    {twilioConfig.isActive && twilioConfig.accountSid && (
                      <Alert className="mt-4">
                        <AlertDescription>
                          Twilio WhatsApp integration is active. The system will send appointment notifications via WhatsApp.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
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
                  Additional third-party integrations will be configured here in
                  the future.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
