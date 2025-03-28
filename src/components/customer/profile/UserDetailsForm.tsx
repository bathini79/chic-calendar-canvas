
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PhoneInput } from "@/components/ui/phone-input";

const formSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  phone: z.string().optional(),
});

export function UserDetailsForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
    },
  });

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user?.id) return;

      setIsLoading(true);
      try {
        // Get email from session
        const email = session.user.email || '';
        
        // Check if profile exists
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error("Error fetching profile:", profileError);
          toast.error("Failed to load profile data");
          return;
        }

        if (profileData) {
          setProfileId(profileData.id);
          form.reset({
            fullName: profileData.full_name || "",
            email: email,
            phone: profileData.phone_number || "",
          });
        } else {
          // If no profile exists, just set the email
          form.reset({
            fullName: session.user.user_metadata?.full_name || "",
            email: email,
            phone: session.user.phone || "",
          });
        }
      } catch (error) {
        console.error("Error in fetchUserProfile:", error);
        toast.error("Something went wrong while loading your profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [session, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!session?.user?.id) {
      toast.error("You must be logged in to update your profile");
      return;
    }

    setIsLoading(true);
    try {
      const userId = session.user.id;
      
      // Update auth metadata (this doesn't actually change the email address for authentication)
      await supabase.auth.updateUser({
        data: {
          full_name: values.fullName,
        }
      });
      
      // Check if profile exists
      if (profileId) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: values.fullName,
            phone_number: values.phone,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: values.fullName,
            phone_number: values.phone,
          });

        if (error) throw error;
        setProfileId(userId);
      }

      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>You need to be logged in to view your profile</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Details</CardTitle>
        <CardDescription>View and update your personal information</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Full name" {...field} />
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
                    <Input 
                      type="email" 
                      placeholder="Email address" 
                      {...field} 
                      disabled 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <PhoneInput placeholder="Phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
