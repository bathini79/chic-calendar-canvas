
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { adminSupabase } from "@/integrations/supabase/client";
import { Customer } from "@/pages/admin/bookings/types";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { generateStrongPassword } from "@/lib/utils";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countryCodes, CountryCode } from "@/lib/country-codes";
import { Loader2 } from "lucide-react";

// Lead source options
const LEAD_SOURCES = [
  "Friend/Family",
  "Google",
  "Instagram",
  "Facebook",
  "Twitter",
  "Website",
  "Walk-in",
  "Advertisement",
  "Other"
];

const createClientSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone_number: z.string().min(10, "Phone number must be at least 10 digits"),
  lead_source: z.string().optional(),
});

type CreateClientFormData = z.infer<typeof createClientSchema>;

interface CreateClientDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
}

export const CreateClientDialog: React.FC<CreateClientDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(
    countryCodes.find(c => c.name === "India") || countryCodes[0]
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const form = useForm<CreateClientFormData>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone_number: "",
      lead_source: "",
    },
  });

  const handleCountryChange = (country: CountryCode) => {
    setSelectedCountry(country);
  };

  const onSubmit = async (data: CreateClientFormData) => {
    try {
      setIsVerifying(true);
      
      // Format phone number with country code (without + sign)
      const countryCodeWithoutPlus = selectedCountry.code.startsWith('+') 
        ? selectedCountry.code.substring(1) 
        : selectedCountry.code;
      
      const formattedPhone = `+${countryCodeWithoutPlus}${data.phone_number.replace(/\s+/g, '')}`;
      
      // Send WhatsApp OTP
      const response = await fetch(`${window.location.origin}/api/send-whatsapp-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phoneNumber: formattedPhone,
          fullName: data.full_name,
          lead_source: data.lead_source || null
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to send verification message');
      }
      
      setVerificationSent(true);
      setIsVerifying(false);
      
      toast.success("Verification message sent to WhatsApp. Ask the client to click the link to verify.");
      
      // Prepare the customer object to return
      // We'll return this now so the UI can continue, even though verification is still pending
      const customerData: Customer = {
        id: "", // This will be filled after verification
        full_name: data.full_name,
        email: data.email || "",
        phone_number: formattedPhone
      };
      
      onSuccess(customerData);
      form.reset();
      onClose();
      
    } catch (error: any) {
      setIsVerifying(false);
      toast.error("Failed to send verification: " + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Optional)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <PhoneInput 
                      placeholder="9876543210" 
                      {...field} 
                      selectedCountry={selectedCountry}
                      onCountryChange={handleCountryChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lead_source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How did you hear about us?</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a source" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LEAD_SOURCES.map((source) => (
                        <SelectItem key={source} value={source}>
                          {source}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isVerifying}>
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Verification'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
