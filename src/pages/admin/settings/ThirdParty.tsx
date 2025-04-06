
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
import { GupshupConfig } from "@/components/admin/settings/GupshupConfig";
import { NotificationQueueProcessor } from "@/components/admin/settings/NotificationQueueProcessor";

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
  const { toast } = useToast();

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
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (activeSection === "twilio") {
      fetchTwilioAccountDetails();
    }
  }, [activeSection, toast]);

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

          {activeSection === "twilio" && (
            <Card>
              <CardHeader>
                <CardTitle>Twilio Account Details</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <>
                    <Skeleton className="h-10 w-full mb-4 rounded-md" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-16 rounded-md" />
                      ))}
                    </div>
                    <Skeleton className="h-8 w-40 mt-6" />
                    <Spinner />
                  </>
                ) : error ? (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : accountDetails ? (
                  <div className="space-y-6">
                    {/* Status at top */}
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium">Status:</p>
                      <p className="text-xs text-green-700 font-semibold">
                      {accountDetails.status}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Balance</p>
                        <p className="font-medium">
                          {accountDetails.balance} {accountDetails.currency}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Account Type</p>
                        <p className="font-medium">{accountDetails.account_type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Messages Sent</p>
                        <p className="font-medium">
                          {accountDetails.total_messages_sent}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Last Billing Amount
                        </p>
                        <p className="font-medium">
                          {accountDetails.last_billing_amount}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Last Billing Period
                        </p>
                        <p className="font-medium">
                          {accountDetails.last_billing_start} →{" "}
                          {accountDetails.last_billing_end}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Next Billing Date
                        </p>
                        <p className="font-medium">
                          {accountDetails.next_billing_date}
                        </p>
                      </div>
                    </div>

                    <div>
                      <a
                        href={accountDetails.billing_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-sm font-medium text-blue-600 hover:underline"
                      >
                        View Billing Details
                      </a>
                    </div>
                  </div>
                ) : (
                  <p>No account details available.</p>
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
