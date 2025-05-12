import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Customer } from "@/pages/admin/bookings/types";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PhoneInput } from "@/components/ui/phone-input";
import { LoaderCircle, AlertCircle } from "lucide-react";
import { CountryCode } from "@/lib/country-codes";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Lead source options for the dropdown
const leadSourceOptions = [
  { value: "search_engine", label: "Google/Search Engine" },
  { value: "social_media", label: "Social Media" },
  { value: "friend_referral", label: "Friend Referral" },
  { value: "advertisement", label: "Advertisement" },
  { value: "walk_in", label: "Walk In" },
  { value: "other", label: "Other" },
];

// Define the form schema with validation
const createClientSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone_number: z.string().min(10, "Valid phone number is required"),
  lead_source: z.string().min(1, "How did you hear about us is required"),
  otp: z.string().optional(),
  skip_otp: z.boolean().optional(),
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [skipOtp, setSkipOtp] = useState(false);
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null);
  const [userChoice, setUserChoice] = useState<"select" | "create" | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>({ 
    name: "India", 
    code: "+91", 
    flag: "🇮🇳" 
  });

  const form = useForm<CreateClientFormData>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone_number: "",
      lead_source: "",
      otp: "",
      skip_otp: false,
    },
  });

  const handleCancel = () => {
    form.reset();
    setOtpSent(false);
    setSkipOtp(false);
    setExistingCustomer(null);
    setUserChoice(null);
    onClose();
  };

  // Function to send verification OTP
  const sendVerificationOTP = async () => {
    try {
      const formData = form.getValues();
      if (!formData.full_name) {
        toast.error("Full name is required");
        return;
      }
      if (!formData.phone_number) {
        toast.error("Phone number is required");
        return;
      }
      if (!formData.lead_source) {
        toast.error("Lead source is required");
        return;
      }

      setIsSubmitting(true);
      
      const countryCodeWithoutPlus = selectedCountry.code.replace("+", "");
      const formattedPhoneNumber = formData.phone_number.replace(/\s/g, "");
      const fullPhoneNumber = `${countryCodeWithoutPlus}${formattedPhoneNumber}`;
      const baseUrl = `${window.location.protocol}//${window.location.host}`;
      
      const { data, error } = await supabase.functions.invoke('send-whatsapp-otp', {
        body: { 
          phoneNumber: fullPhoneNumber,
          fullName: formData.full_name,
          lead_source: formData.lead_source,
          baseUrl
        }
      });

      if (error) {
        toast.error("Failed to send verification code: " + error.message);
        return;
      }

      if (data?.success) {
        toast.success("Verification code sent successfully");
        setOtpSent(true);
      } else {
        toast.error("Failed to send verification code: " + (data?.error || "Unknown error"));
        // Clear form data on failure
        form.reset();
        setOtpSent(false);
        setSkipOtp(false);
        setExistingCustomer(null);
        setUserChoice(null);
      }
    } catch (error: any) {
      toast.error("Error sending verification code: " + error.message);
      // Clear form data on error
      form.reset();
      setOtpSent(false);
      setSkipOtp(false);
      setExistingCustomer(null);
      setUserChoice(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to verify OTP and create customer
  const verifyOTPAndCreateCustomer = async () => {
    try {
      const formData = form.getValues();
      if (!formData.otp) {
        toast.error("Please enter the verification code");
        return;
      }

      setIsSubmitting(true);
      
      const countryCodeWithoutPlus = selectedCountry.code.replace("+", "");
      const formattedPhoneNumber = formData.phone_number.replace(/\s/g, "");
      const fullPhoneNumber = `${countryCodeWithoutPlus}${formattedPhoneNumber}`;
      
      const { data, error } = await supabase.functions.invoke('verify-whatsapp-otp', {
        body: { 
          phoneNumber: fullPhoneNumber,
          code: formData.otp,
          fullName: formData.full_name,
          lead_source: formData.lead_source,
          provider: "twofactor"
        }
      });

      if (error) {
        toast.error("Verification failed: " + error.message);
        return;
      }

      if (data?.success) {
        toast.success("Client verified and created successfully");
        
        const newCustomer: Customer = {
          id: data.userId,
          full_name: data.fullName,
          phone_number: data.phoneNumber,
          email: formData.email || undefined,
        };
        
        form.reset();
        setOtpSent(false);
        setSkipOtp(false);
        onSuccess(newCustomer);
        onClose();
      } else {
        toast.error("Verification failed: " + (data?.message || "Unknown error"));
      }
    } catch (error: any) {
      toast.error("Error verifying code: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to create customer directly without OTP verification
  const createCustomerDirectly = async () => {
    try {
      const formData = form.getValues();
      
      if (!formData.full_name) {
        toast.error("Full name is required");
        return;
      }
      if (!formData.phone_number) {
        toast.error("Phone number is required");
        return;
      }
      if (!formData.lead_source) {
        toast.error("Lead source is required");
        return;
      }

      setIsSubmitting(true);
      
      const countryCodeWithoutPlus = selectedCountry.code.replace("+", "");
      const formattedPhoneNumber = formData.phone_number.replace(/\s/g, "");
      const fullPhoneNumber = `${countryCodeWithoutPlus}${formattedPhoneNumber}`;
      
      const { data, error } = await supabase.functions.invoke('verify-whatsapp-otp', {
        body: { 
          phoneNumber: fullPhoneNumber,
          fullName: formData.full_name,
          email: formData.email || undefined,
          lead_source: formData.lead_source,
          skipOtpVerification: true,
          provider: "admin"
        }
      });

      if (error) {
        toast.error("Failed to create client: " + error.message);
        return;
      }

      if (data?.success) {
        toast.success("Client created successfully");
        
        const newCustomer: Customer = {
          id: data.userId,
          full_name: data.fullName || formData.full_name,
          phone_number: data.phoneNumber || fullPhoneNumber,
          email: formData.email || undefined,
        };
        
        form.reset();
        setSkipOtp(false);
        onSuccess(newCustomer);
        onClose();
      } else {
        toast.error("Failed to create client: " + (data?.message || "Unknown error"));
      }
    } catch (error: any) {
      toast.error("Error creating client: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to check if phone number exists
  const checkPhoneNumberExists = async (phoneNumber: string) => {
    if (!phoneNumber || phoneNumber.length < 10) return;
    
    try {
      const countryCodeWithoutPlus = selectedCountry.code.replace("+", "");
      const formattedPhoneNumber = phoneNumber.replace(/\s/g, "");
      const fullPhoneNumber = `${countryCodeWithoutPlus}${formattedPhoneNumber}`;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone_number', fullPhoneNumber)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error("Error checking phone number:", error);
        return;
      }
      
      if (data) {
        setExistingCustomer({
          id: data.id,
          full_name: data.full_name,
          phone_number: data.phone_number,
          email: data.email || undefined,
        });
      } else {
        setExistingCustomer(null);
        setUserChoice(null);
      }
    } catch (error) {
      console.error("Error checking phone number:", error);
    }
  };
  
  // Check for existing customer when phone number changes
  useEffect(() => {
    const phoneNumber = form.watch("phone_number");
    const debouncedCheck = setTimeout(() => {
      checkPhoneNumberExists(phoneNumber);
    }, 500);
    
    return () => clearTimeout(debouncedCheck);
  }, [form.watch("phone_number"), selectedCountry]);

  // Reset customer selection when dialog closes
  useEffect(() => {
    if (!open) {
      setExistingCustomer(null);
      setUserChoice(null);
    }
  }, [open]);

  // Clear phone number and hide existing customer warning when user selects "create new" option
  useEffect(() => {
    if (userChoice === "create") {
      form.setValue("phone_number", "");
      form.trigger("phone_number");
      setExistingCustomer(null);
    }
  }, [userChoice, form]);

  // Fill customer details when selecting existing customer
  useEffect(() => {
    if (userChoice === "select" && existingCustomer) {
      form.setValue("full_name", existingCustomer.full_name);
      if (existingCustomer.email) {
        form.setValue("email", existingCustomer.email);
      }
    }
  }, [userChoice, existingCustomer, form]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (existingCustomer && userChoice === "select") {
      onSuccess(existingCustomer);
      form.reset();
      setOtpSent(false);
      setSkipOtp(false);
      setExistingCustomer(null);
      setUserChoice(null);
      onClose();
      return;
    }
    
    if (skipOtp) {
      await createCustomerDirectly();
    } else if (otpSent) {
      await verifyOTPAndCreateCustomer();
    } else {
      await sendVerificationOTP();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="John Doe" 
                      {...field} 
                      disabled={otpSent || (existingCustomer && userChoice === "select")}
                    />
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
                  <FormLabel>Phone Number *</FormLabel>
                  <FormControl>
                    <PhoneInput 
                      placeholder="9876543210..." 
                      selectedCountry={selectedCountry}
                      onCountryChange={setSelectedCountry}
                      {...field}
                      disabled={otpSent || (existingCustomer && userChoice === "select")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {existingCustomer && (
              <Alert variant="warning" className="bg-amber-50 border-amber-300">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertTitle>Existing customer found</AlertTitle>
                <AlertDescription>
                  A customer with this phone number already exists.
                  <div className="mt-2">
                    <strong>Name:</strong> {existingCustomer.full_name}<br />
                    {existingCustomer.email && (
                      <>
                        <strong>Email:</strong> {existingCustomer.email}<br />
                      </>
                    )}
                  </div>
                  <RadioGroup
                    className="mt-3"
                    value={userChoice || ""}
                    onValueChange={(value) => setUserChoice(value as "select" | "create")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="select" id="select-existing" />
                      <label htmlFor="select-existing" className="text-sm font-medium">
                        Select this customer
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="create" id="create-new" />
                      <label htmlFor="create-new" className="text-sm font-medium">
                        Create new customer record
                      </label>
                    </div>
                  </RadioGroup>
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="john@example.com" 
                      {...field} 
                      disabled={otpSent || (existingCustomer && userChoice === "select")} 
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
                  <FormLabel>How did you hear about us? *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={otpSent}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {leadSourceOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!otpSent && !existingCustomer && (
              <FormField
                control={form.control}
                name="skip_otp"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-2">
                    <FormControl>
                      <Checkbox 
                        checked={skipOtp} 
                        onCheckedChange={(checked) => {
                          setSkipOtp(!!checked);
                          field.onChange(!!checked);
                        }}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Skip OTP verification (admin only)
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {!existingCustomer && otpSent && (
              <FormField
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter 6-digit code" 
                        {...field}
                        maxLength={6}
                        inputMode="numeric" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || (existingCustomer && !userChoice)}
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    {otpSent ? "Verifying..." : skipOtp ? "Creating Client..." : "Sending..."}
                  </>
                ) : (
                  existingCustomer && userChoice === "select"
                    ? "Select Customer"
                    : otpSent
                      ? "Verify & Create Client" 
                      : skipOtp
                        ? "Create Client Directly" 
                        : "Send Verification"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
