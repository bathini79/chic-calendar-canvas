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
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { GupshupConfig } from "@/components/admin/settings/GupshupConfig";
import { NotificationQueueProcessor } from "@/components/admin/settings/NotificationQueueProcessor";
import { toast } from "@/lib/toast"; // Import our centralized toast utility

// Optional fallback Spinner
const Spinner = () => (
  <div className="flex justify-center py-6">
    <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

interface TwilioAccountDetails {
  balance: string;
  currency: string;
  status: string;
  account_type: string;
  total_messages_sent: number;
  last_billing_amount: string;
  last_billing_start: string;
  last_billing_end: string;
  next_billing_date: string;
  billing_url: string;
}

export default function ThirdParty() {
  const [isLoading, setIsLoading] = useState(true);
  const [accountDetails, setAccountDetails] =
    useState<TwilioAccountDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("gupshup");

  useEffect(() => {
    const fetchTwilioAccountDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error } = await supabase.functions.invoke(
          "get-twilio-config"
        );

        if (error) throw new Error(error.message);

        if (data) setAccountDetails(data);
      } catch (error: any) {
        console.error("Error fetching Twilio account details:", error);
        setError("Failed to fetch Twilio account details. Please try again later.");
        toast.error("Error fetching Twilio account details", {
          description: error.message
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (activeSection === "twilio") {
      fetchTwilioAccountDetails();
    }
  }, [activeSection]);

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
                  activeSection === "gupshup" ? "bg-accent" : ""
                }`}
                onClick={() => setActiveSection("gupshup")}
              >
                <span>GupShup Configuration</span>
              </div>
              <div
                className={`px-4 py-2 cursor-pointer ${
                  activeSection === "notifications" ? "bg-accent" : ""
                }`}
                onClick={() => setActiveSection("notifications")}
              >
                <span>Notification Queue</span>
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
          {activeSection === "gupshup" && <GupshupConfig />}
          
          {activeSection === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Queue</CardTitle>
              </CardHeader>
              <CardContent>
                <NotificationQueueProcessor />
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
