
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileEditDialog } from "@/components/customer/profile/ProfileEditDialog";

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
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

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

  const handleProfileUpdate = async (updatedProfile: Partial<ProfileData>) => {
    try {
      const userId = profile?.id;
      if (!userId) return;

      // Format birth_date as string if it's a Date object
      let birthDate = updatedProfile.birth_date;
      if (birthDate instanceof Date) {
        birthDate = birthDate.toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: updatedProfile.full_name,
          phone_number: updatedProfile.phone_number,
          birth_date: birthDate,
          gender: updatedProfile.gender,
        })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success("Profile updated successfully");
      fetchUserProfile();
      setEditDialogOpen(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const handleAvatarUpdate = async (avatarUrl: string) => {
    try {
      const userId = profile?.id;
      if (!userId) return;

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success("Profile picture updated");
      fetchUserProfile();
    } catch (error: any) {
      console.error("Error updating avatar:", error);
      toast.error("Failed to update profile picture");
    }
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part.charAt(0))
      .join("")
      .toUpperCase();
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Profile header */}
        <div className="mb-8 text-center">
          <div className="relative inline-block mb-4">
            <Avatar className="h-24 w-24 border-4 border-background">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={profile?.full_name || ""} />
              ) : (
                <AvatarFallback className="text-2xl bg-black text-primary-foreground">
                  {getInitials(profile?.full_name || "")}
                </AvatarFallback>
              )}
            </Avatar>
            <Button 
              size="icon" 
              variant="outline" 
              className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-background border shadow-sm"
              onClick={() => setEditDialogOpen(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
          <h1 className="text-2xl font-bold">{profile?.full_name}</h1>
          <p className="text-muted-foreground">{profile?.email}</p>
        </div>

        <div className="flex justify-end mb-4">
          <Button 
            variant="outline" 
            className="text-primary"
            onClick={() => setEditDialogOpen(true)}
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
      </div>

      {/* Edit Profile Dialog */}
      {profile && (
        <ProfileEditDialog 
          open={editDialogOpen} 
          onOpenChange={setEditDialogOpen}
          profile={profile}
          onSubmit={handleProfileUpdate}
          onAvatarUpdate={handleAvatarUpdate}
        />
      )}
    </div>
  );
};

export default ProfileDetails;
