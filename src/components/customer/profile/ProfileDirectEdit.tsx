
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  birth_date: string | null;
  gender: string | null;
  avatar_url: string | null;
}

const ProfileDirectEdit = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const navigate = useNavigate();
  
  // Form state
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [formModified, setFormModified] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Not authenticated");
        navigate("/auth");
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
      
      // Set form values
      setFullName(profileData.full_name || "");
      setPhoneNumber(profileData.phone_number || "");
      setGender(profileData.gender);
      setBirthDate(profileData.birth_date ? new Date(profileData.birth_date) : null);
    } catch (error: any) {
      console.error("Error in fetchUserProfile:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = () => {
    setFormModified(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userId = profile?.id;
      if (!userId) return;

      if (avatarFile) {
        await handleAvatarUpload();
      }

      // Format birthDate as string if it's a Date object
      let formattedBirthDate = null;
      if (birthDate) {
        formattedBirthDate = birthDate.toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone_number: phoneNumber,
          birth_date: formattedBirthDate,
          gender,
        })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success("Profile updated successfully");
      fetchUserProfile();
      setFormModified(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAvatarFile(e.target.files[0]);
      setFormModified(true);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile || !profile?.id) return;

    try {
      setUploading(true);

      // Create a unique file path for the user's avatar
      const fileExt = avatarFile.name.split('.').pop();
      const filePath = `avatars/${profile.id}/${Math.random().toString(36).substring(2)}.${fileExt}`;

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
        .eq('id', profile.id);
      
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
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile header */}
          <div className="mb-8 text-center">
            <div className="relative inline-block mb-4">
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
              <div className="absolute bottom-0 right-0">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  id="avatar-upload"
                />
                <label htmlFor="avatar-upload">
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="outline" 
                    className="rounded-full h-8 w-8 bg-background border shadow-sm cursor-pointer"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </label>
              </div>
            </div>
            <Input
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                handleFormChange();
              }}
              className="text-xl font-bold text-center border-none focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Your Name"
            />
            <p className="text-muted-foreground">{profile?.email}</p>
          </div>

          {/* Personal Info */}
          <Card>
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
                    onChange={(e) => {
                      setFullName(e.target.value);
                      handleFormChange();
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Mobile Number</Label>
                  <PhoneInput
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(value) => {
                      setPhoneNumber(value);
                      handleFormChange();
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={profile?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Date of Birth</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="birthDate"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !birthDate && "text-muted-foreground"
                        )}
                        onClick={() => handleFormChange()}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {birthDate ? format(birthDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={birthDate || undefined}
                        onSelect={(date) => {
                          setBirthDate(date);
                          handleFormChange();
                        }}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select 
                    value={gender || ""} 
                    onValueChange={(value) => {
                      setGender(value);
                      handleFormChange();
                    }}
                  >
                    <SelectTrigger id="gender">
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

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={!formModified || uploading}
              className="min-w-[120px]"
            >
              {uploading ? "Uploading..." : "Update Profile"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileDirectEdit;
