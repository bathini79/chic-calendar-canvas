import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { parsePhoneCountryCode } from "@/enums/CountryCode";

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated?: () => void;
}

export function CreateClientDialog({
  open,
  onOpenChange,
  onClientCreated
}: CreateClientDialogProps) {
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState({
    name: "United States",
    flag: "🇺🇸",
    code: "+1",
  });
  const [isOTPSent, setIsOTPSent] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [error, setError] = useState("");
  const leadSource = "admin_booking";

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value);
  };

  const handleCountryChange = (country: any) => {
    setPhoneCountryCode(country);
  };

  const handleSendOTP = async (phoneWithCode: string, fullName: string) => {
    try {
      setIsSendingOTP(true);
      setError("");
      
      // Get the base URL from the current window location
      const baseUrl = `${window.location.protocol}//${window.location.host}`;
      
      const { data, error } = await supabase.functions.invoke("send-whatsapp-otp", {
        body: {
          phoneNumber: phoneWithCode,
          fullName,
          lead_source: leadSource,
          baseUrl
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setIsOTPSent(true);
        toast.success("Verification link sent successfully. Please ask the customer to check their WhatsApp.");
      } else {
        throw new Error(data.error || "Failed to send verification link");
      }
    } catch (err: any) {
      console.error("Error sending OTP:", err);
      setError(err.message || "Failed to send verification link. Please try again.");
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleSubmit = async () => {
    const phoneWithCode = phoneCountryCode.code + " " + phoneNumber;

    if (!fullName) {
      setError("Full name is required");
      return;
    }

    if (!phoneNumber) {
      setError("Phone number is required");
      return;
    }

    await handleSendOTP(phoneWithCode, fullName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Client</DialogTitle>
          <DialogDescription>
            Enter the client's details to send a verification link.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {error && (
            <div className="text-red-500 text-sm" role="alert">
              {error}
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Full Name
            </Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              Phone Number
            </Label>
            <div className="col-span-3">
              <PhoneInput
                id="phone"
                selectedCountry={phoneCountryCode}
                onCountryChange={handleCountryChange}
                onChange={handlePhoneChange}
              />
            </div>
          </div>
          {isOTPSent && (
            <div className="text-green-500 text-sm" role="alert">
              Verification link sent successfully!
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSendingOTP || isOTPSent}>
            {isSendingOTP ? "Sending..." : "Send Verification Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
