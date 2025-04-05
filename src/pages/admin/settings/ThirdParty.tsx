
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Send } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormDialog } from "@/components/ui/form-dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";

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

// Schema for test notification form
const testNotificationSchema = z.object({
  appointmentId: z.string().min(1, "Appointment ID is required"),
  notificationType: z.enum([
    "booking_confirmation",
    "appointment_confirmed",
    "reminder_1hr",
    "reminder_4hr",
    "appointment_completed"
  ]),
});

type TestNotificationValues = z.infer<typeof testNotificationSchema>;

export default function ThirdParty() {
  const [isLoading, setIsLoading] = useState(true);
  const [accountDetails, setAccountDetails] =
    useState<TwilioAccountDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("twilio");
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const { toast } = useToast();

  const testNotificationForm = useForm<TestNotificationValues>({
    resolver: zodResolver(testNotificationSchema),
    defaultValues: {
      appointmentId: "",
      notificationType: "appointment_confirmed",
    },
  });

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

    fetchTwilioAccountDetails();
  }, [toast]);

  const handleSendTestNotification = async (values: TestNotificationValues) => {
    try {
      setIsSendingNotification(true);

      const { error } = await supabase.functions.invoke(
        "send-appointment-notification", 
        { 
          body: { 
            appointmentId: values.appointmentId,
            notificationType: values.notificationType,
          } 
        }
      );

      if (error) throw new Error(error.message);

      toast({
        title: "Success",
        description: `${values.notificationType} notification sent successfully`,
      });
      
      setShowTestDialog(false);
    } catch (error: any) {
      console.error("Error sending test notification:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send test notification",
        variant: "destructive",
      });
    } finally {
      setIsSendingNotification(false);
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
              <CardFooter className="flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowTestDialog(true)}
                  disabled={isLoading || !accountDetails}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Test Notification
                </Button>
              </CardFooter>
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

      {/* Test Notification Dialog */}
      <FormDialog
        open={showTestDialog}
        onOpenChange={setShowTestDialog}
        title="Send Test Notification"
        description="Test WhatsApp notifications for different appointment stages."
        form={testNotificationForm}
        onSubmit={handleSendTestNotification}
        submitLabel={isSendingNotification ? "Sending..." : "Send Test Notification"}
        cancelLabel="Cancel"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Notification Type</label>
            <Select
              onValueChange={(value) => 
                testNotificationForm.setValue('notificationType', value as any)
              }
              defaultValue={testNotificationForm.getValues('notificationType')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select notification type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="booking_confirmation">Booking Confirmation</SelectItem>
                <SelectItem value="appointment_confirmed">Appointment Confirmed</SelectItem>
                <SelectItem value="reminder_1hr">1 Hour Reminder</SelectItem>
                <SelectItem value="reminder_4hr">4 Hour Reminder</SelectItem>
                <SelectItem value="appointment_completed">Appointment Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Appointment ID</label>
            <Input
              placeholder="Enter appointment ID"
              {...testNotificationForm.register('appointmentId')}
            />
            {testNotificationForm.formState.errors.appointmentId && (
              <p className="text-sm text-red-500">
                {testNotificationForm.formState.errors.appointmentId.message}
              </p>
            )}
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
