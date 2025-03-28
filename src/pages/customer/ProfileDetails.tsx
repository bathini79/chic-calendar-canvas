
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Camera } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

const ProfileDetails = () => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    gender: "",
    birth_date: "",
    lead_source: "",
    avatar_url: "",
    facebook_url: "",
    instagram_url: "",
    twitter_url: "",
  });

  // Fetch user profile data
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (profileData: any) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");
      
      const { data, error } = await supabase
        .from("profiles")
        .update(profileData)
        .eq("id", session.user.id);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to update profile: " + error.message);
    }
  });

  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone_number: profile.phone_number || "",
        gender: profile.gender || "",
        birth_date: profile.birth_date || "",
        lead_source: profile.lead_source || "",
        avatar_url: profile.avatar_url || "",
        facebook_url: profile.facebook_url || "",
        instagram_url: profile.instagram_url || "",
        twitter_url: profile.twitter_url || "",
      });
    }
  }, [profile]);

  const handleChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateProfile.mutateAsync(profileData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size should be less than 5MB");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({
          ...prev,
          avatar_url: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast.error("Failed to upload avatar: " + error.message);
    }
  };

  const handleRemoveAvatar = () => {
    setProfileData(prev => ({
      ...prev,
      avatar_url: ""
    }));
  };

  if (isProfileLoading) {
    return <div className="flex justify-center p-8">Loading profile...</div>;
  }

  return (
    <div className="container py-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4 sm:items-start">
              <Label htmlFor="avatar">Profile Picture</Label>
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profileData.avatar_url} />
                  <AvatarFallback className="bg-primary/10">
                    {profileData.full_name ? profileData.full_name.charAt(0).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
                {profileData.avatar_url && (
                  <button 
                    onClick={handleRemoveAvatar}
                    className="absolute -top-2 -right-2 bg-destructive text-white p-1 rounded-full"
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              
              <div className="w-full max-w-xs">
                <div className="relative">
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => document.getElementById('avatar')?.click()}
                    type="button"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {profileData.avatar_url ? "Change Picture" : "Upload Picture"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG or JPG, Max file size 5MB.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={profileData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profileData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="mt-1"
                  disabled
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={profileData.phone_number}
                  onChange={(e) => handleChange('phone_number', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select 
                  value={profileData.gender}
                  onValueChange={(value) => handleChange('gender', value)}
                >
                  <SelectTrigger id="gender" className="mt-1">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="birthDate">Birth Date</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={profileData.birth_date}
                  onChange={(e) => handleChange('birth_date', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="leadSource">How did you hear about us?</Label>
                <Select 
                  value={profileData.lead_source}
                  onValueChange={(value) => handleChange('lead_source', value)}
                >
                  <SelectTrigger id="leadSource" className="mt-1">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="friend">Friend Referral</SelectItem>
                    <SelectItem value="advertisement">Advertisement</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-6">
              <Button 
                onClick={handleSave} 
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Social Media Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                value={profileData.facebook_url}
                onChange={(e) => handleChange('facebook_url', e.target.value)}
                className="mt-1"
                placeholder="https://facebook.com/yourprofile"
              />
            </div>

            <div>
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={profileData.instagram_url}
                onChange={(e) => handleChange('instagram_url', e.target.value)}
                className="mt-1"
                placeholder="https://instagram.com/yourprofile"
              />
            </div>

            <div>
              <Label htmlFor="twitter">X (Twitter)</Label>
              <Input
                id="twitter"
                value={profileData.twitter_url}
                onChange={(e) => handleChange('twitter_url', e.target.value)}
                className="mt-1"
                placeholder="https://x.com/yourprofile"
              />
            </div>

            <div className="mt-6">
              <Button 
                onClick={handleSave} 
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileDetails;
