
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  birth_date: string | null;
  gender: string | null;
  avatar_url: string | null;
}

const ProfileDetails = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhoneNumber(profile.phone_number || "");
      setGender(profile.gender || null);
      setBirthDate(profile.birth_date || null);
    }
  }, [profile]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone_number, birth_date, gender, avatar_url')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        toast.error("Error fetching profile data");
        return;
      }

      setProfile(profileData);
    } catch (error: any) {
      console.error("Error in fetchUserProfile:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      if (!profile?.id) return;

      // Handle avatar upload first if there's a file
      if (avatarFile) {
        await handleAvatarUpload();
      }

      let formattedBirthDate = birthDate;
      if (birthDate && birthDate instanceof Date) {
        formattedBirthDate = birthDate.toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone_number: phoneNumber,
          birth_date: formattedBirthDate,
          gender: gender,
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      toast.success("Profile updated successfully");
      fetchUserProfile();
      setEditing(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAvatarFile(e.target.files[0]);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;

    try {
      setUploading(true);

      // Create a unique file path for the user's avatar
      const fileExt = avatarFile.name.split('.').pop();
      const filePath = `avatars/${profile?.id}/${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, avatarFile);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      // Update the profile with the new avatar URL
      await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', profile?.id);
      
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part.charAt(0))
      .join("")
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Profile header */}
        <div className="mb-8 text-center">
          <div className="relative inline-block mb-4">
            <label htmlFor="avatar-upload" className="cursor-pointer">
              <Avatar className="h-24 w-24 border-4 border-background">
                {avatarFile ? (
                  <AvatarImage src={URL.createObjectURL(avatarFile)} alt={profile?.full_name || ""} />
                ) : profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile?.full_name || ""} />
                ) : (
                  <AvatarFallback className="text-2xl bg-black text-primary-foreground">
                    {getInitials(profile?.full_name || "")}
                  </AvatarFallback>
                )}
              </Avatar>
              <Input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                id="avatar-upload"
                disabled={!editing}
              />
              {editing && (
                <div className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-background border shadow-sm flex items-center justify-center">
                  <Pencil className="h-4 w-4" />
                </div>
              )}
            </label>
          </div>
          <h1 className="text-2xl font-bold">{profile?.full_name}</h1>
          <p className="text-muted-foreground">{profile?.email}</p>
        </div>

        {!editing ? (
          <>
            <div className="flex justify-end mb-4">
              <Button 
                variant="outline" 
                className="text-primary"
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
            </div>

            {/* Personal Info */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                    <p>{profile?.full_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Mobile Number</p>
                    <p>{profile?.phone_number || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p>{profile?.email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                    <p>{profile?.birth_date ? new Date(profile.birth_date).toLocaleDateString() : "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Gender</p>
                    <p>{profile?.gender || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <div className="flex justify-end mb-4 space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleProfileUpdate}
                disabled={uploading}
              >
                {uploading ? "Saving..." : "Save Changes"}
              </Button>
            </div>

            {/* Edit Personal Info */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Mobile Number</Label>
                    <Input 
                      id="phoneNumber" 
                      value={phoneNumber} 
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      value={profile?.email || ""} 
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Date of Birth</Label>
                    <Input 
                      id="birthDate" 
                      type="date" 
                      value={birthDate ? new Date(birthDate).toISOString().split('T')[0] : ""}
                      onChange={(e) => setBirthDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={gender || ""} onValueChange={setGender}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfileDetails;
