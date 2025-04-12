
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { adminSupabase, supabase } from "@/integrations/supabase/client";
import { Customer } from "@/pages/admin/bookings/types";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PhoneInput } from "@/components/ui/phone-input";
import { LoaderCircle } from "lucide-react";

const createClientSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone_number: z.string().min(10, "Valid phone number is required"),
  lead_source: z.string().min(1, "How did you hear about us is required"),
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

  const form = useForm<CreateClientFormData>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone_number: "",
      lead_source: "",
    },
  });

  const sendWhatsAppVerification = async (phoneNumber: string) => {
    try {
      setIsSubmitting(true);
      const { data, error } = await supabase.functions.invoke('send-whatsapp-otp', {
        body: { phoneNumber }
      });

      if (error) {
        toast.error("Failed to send verification: " + error.message);
        setIsSubmitting(false);
        return false;
      }

      if (data?.success) {
        toast.success("Verification code sent to WhatsApp");
        setOtpSent(true);
        setIsSubmitting(false);
        return true;
      } else {
        toast.error("Failed to send verification: " + (data?.error || "Unknown error"));
        setIsSubmitting(false);
        return false;
      }
    } catch (error: any) {
      toast.error("Failed to send verification: " + error.message);
      setIsSubmitting(false);
      return false;
    }
  };

  const onSubmit = async (data: CreateClientFormData) => {
    try {
      setIsSubmitting(true);

      // Format phone number to ensure it has international format with + prefix
      const formattedPhone = data.phone_number.startsWith('+') 
        ? data.phone_number 
        : `+${data.phone_number.replace(/\D/g, '')}`;

      // Send WhatsApp verification
      const verificationSent = await sendWhatsAppVerification(formattedPhone);
      
      if (!verificationSent) {
        setIsSubmitting(false);
        return;
      }

      // Create customer entry with pending verification status
      const { data: clientData, error: clientError } = await supabase
        .from('profiles')
        .insert({
          full_name: data.full_name,
          email: data.email || null,
          phone_number: formattedPhone,
          lead_source: data.lead_source,
          role: 'customer',
          phone_verified: false, // Will be updated after verification
        })
        .select()
        .single();

      if (clientError) {
        toast.error("Failed to create client: " + clientError.message);
        setIsSubmitting(false);
        return;
      }

      toast.success("Verification sent to client's WhatsApp. Customer will be created after verification.");
      onSuccess(clientData as Customer);
      form.reset();
      onClose();
    } catch (error: any) {
      toast.error("Failed to create client: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const leadSourceOptions = [
    { value: "social_media", label: "Social Media" },
    { value: "friend_referral", label: "Friend Referral" },
    { value: "google", label: "Google Search" },
    { value: "advertisement", label: "Advertisement" },
    { value: "walk_in", label: "Walk-in" },
    { value: "other", label: "Other" },
  ];

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
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
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
                      {...field}
                    />
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
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
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

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Create Client"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
