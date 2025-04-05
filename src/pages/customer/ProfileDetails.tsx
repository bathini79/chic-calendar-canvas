import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useCustomerMemberships } from "@/hooks/use-customer-memberships";
import { MembershipDetailsCard } from "@/components/customer/profile/MembershipDetailsCard";

interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  birth_date: string;
  gender: string;
  linkedin_url: string;
  twitter_url: string;
  instagram_url: string;
  facebook_url: string;
  avatar_url: string;
  lead_source?: string;
}

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const referralSources = [
  { value: "google", label: "Google Search" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "friend", label: "Friend or Family" },
  { value: "existing_customer", label: "I'm an Existing Customer" },
  { value: "walk_by", label: "Walk By" },
  { value: "other", label: "Other" },
];

const ProfileDetails = () => {
  const [formData, setFormData] = useState<Partial<ProfileData>>({
    full_name: "",
    phone_number: "",
    birth_date: "",
    gender: "",
    linkedin_url: "",
    twitter_url: "",
    instagram_url: "",
    facebook_url: "",
    lead_source: "",
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { customerMemberships } = useCustomerMemberships();
  const [hasMembership, setHasMembership] = useState(false);
  const [profileFetched, setProfileFetched] = useState(false);

  // Get session data using React Query
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const userId = session?.user?.id;

  // Fetch user profile once when userId is available
  useEffect(() => {
    if (!userId || profileFetched) return;
    
    const fetchUserProfile = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setFormData({
            id: data.id,
            full_name: data.full_name || "",
            email: data.email || "",
            phone_number: data.phone_number || "",
            birth_date: data.birth_date || "",
            gender: data.gender || "",
            linkedin_url: data.linkedin_url || "",
            twitter_url: data.twitter_url || "",
            instagram_url: data.instagram_url || "",
            facebook_url: data.facebook_url || "",
            avatar_url: data.avatar_url || "",
            lead_source: data.lead_source || "",
          });
          setProfileFetched(true);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load profile data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId, profileFetched]);

  // Check if user has active memberships
  useEffect(() => {
    if (!customerMemberships) return;
    
    const now = new Date();
    const activeMemberships = customerMemberships.filter(
      (membership) => new Date(membership.end_date) > now
    );

    setHasMembership(activeMemberships.length > 0);
  }, [customerMemberships]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      birth_date: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          birth_date: formData.birth_date,
          gender: formData.gender,
          linkedin_url: formData.linkedin_url,
          twitter_url: formData.twitter_url,
          instagram_url: formData.instagram_url,
          facebook_url: formData.facebook_url,
          lead_source: formData.lead_source,
        })
        .eq("id", session.user.id);
      
      if (error) throw error;
      
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      {session?.user?.id && <MembershipDetailsCard customerId={session.user.id} />}
      
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="full_name" className="text-sm font-medium">
                  Full Name
                </label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name || ""}
                  onChange={handleInputChange}
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="phone_number" className="text-sm font-medium">
                  Phone Number
                </label>
                <Input
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number || ""}
                  onChange={handleInputChange}
                  placeholder="Your phone number"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="birth_date" className="text-sm font-medium">
                  Birth Date
                </label>
                <Input
                  id="birth_date"
                  name="birth_date"
                  type="date"
                  value={formData.birth_date ? format(new Date(formData.birth_date), 'yyyy-MM-dd') : ""}
                  onChange={handleDateChange}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="gender" className="text-sm font-medium">
                  Gender
                </label>
                <Select
                  value={formData.gender || ""}
                  onValueChange={(value) => handleSelectChange("gender", value)}
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {genderOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileDetails;