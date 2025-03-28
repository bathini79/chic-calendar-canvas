
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Plus, Linkedin, Twitter, Instagram, Facebook } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProfileSidebar } from "./ProfileSidebar";
import { ProfileEditDialog } from "./ProfileEditDialog";
import { AddressCard } from "./AddressCard";
import { AddAddressDialog } from "./AddAddressDialog";

interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  birth_date: string | null;
  gender: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  addresses: Address[];
}

interface Address {
  id: string;
  user_id: string;
  type: 'home' | 'work' | 'other';
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
}

export const ProfilePage = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addAddressDialogOpen, setAddAddressDialogOpen] = useState(false);
  const navigate = useNavigate();

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
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        toast.error("Error fetching profile data");
        return;
      }

      // Fetch addresses
      const { data: addressesData, error: addressesError } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (addressesError) {
        console.error("Error fetching addresses:", addressesError);
      }

      setProfile({
        ...profileData,
        addresses: addressesData || []
      });
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
          linkedin_url: updatedProfile.linkedin_url,
          twitter_url: updatedProfile.twitter_url,
          instagram_url: updatedProfile.instagram_url,
          facebook_url: updatedProfile.facebook_url,
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

  const handleAddAddress = async (address: Omit<Address, 'id' | 'user_id' | 'created_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Add the new address
      const { error } = await supabase
        .from('user_addresses')
        .insert({
          user_id: user.id,
          ...address
        });

      if (error) throw error;
      
      toast.success("Address added successfully");
      fetchUserProfile();
      setAddAddressDialogOpen(false);
    } catch (error: any) {
      console.error("Error adding address:", error);
      toast.error("Failed to add address");
    }
  };

  const handleEditAddress = async (address: Partial<Address> & { id: string }) => {
    try {
      const { error } = await supabase
        .from('user_addresses')
        .update(address)
        .eq('id', address.id);

      if (error) throw error;
      
      toast.success("Address updated successfully");
      fetchUserProfile();
    } catch (error: any) {
      console.error("Error updating address:", error);
      toast.error("Failed to update address");
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;
      
      toast.success("Address deleted successfully");
      fetchUserProfile();
    } catch (error: any) {
      console.error("Error deleting address:", error);
      toast.error("Failed to delete address");
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
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      {/* Sidebar for desktop */}
      <div className="hidden md:block">
        <ProfileSidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Profile header */}
          <div className="mb-8 text-center">
            <div className="relative inline-block mb-4">
              <Avatar className="h-24 w-24 border-4 border-background">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile?.full_name || ""} />
                ) : (
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
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

          {/* Addresses */}
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>My Addresses</CardTitle>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setAddAddressDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </CardHeader>
            <CardContent>
              {profile?.addresses && profile.addresses.length > 0 ? (
                <div className="grid gap-4">
                  {profile.addresses.map((address) => (
                    <AddressCard 
                      key={address.id} 
                      address={address} 
                      onEdit={handleEditAddress}
                      onDelete={handleDeleteAddress}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No addresses added yet</p>
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => setAddAddressDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Address
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card>
            <CardHeader>
              <CardTitle>Social Media</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <a 
                    href={profile?.linkedin_url || "#"} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`block p-4 rounded-md border ${profile?.linkedin_url ? 'text-blue-600 hover:bg-blue-50' : 'text-muted-foreground cursor-default'}`}
                    onClick={e => !profile?.linkedin_url && e.preventDefault()}
                  >
                    <Linkedin className="h-6 w-6 mx-auto mb-2" />
                    <span className="text-xs">LinkedIn</span>
                  </a>
                </div>
                <div className="text-center">
                  <a 
                    href={profile?.twitter_url || "#"} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`block p-4 rounded-md border ${profile?.twitter_url ? 'text-blue-400 hover:bg-blue-50' : 'text-muted-foreground cursor-default'}`}
                    onClick={e => !profile?.twitter_url && e.preventDefault()}
                  >
                    <Twitter className="h-6 w-6 mx-auto mb-2" />
                    <span className="text-xs">Twitter</span>
                  </a>
                </div>
                <div className="text-center">
                  <a 
                    href={profile?.instagram_url || "#"} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`block p-4 rounded-md border ${profile?.instagram_url ? 'text-pink-500 hover:bg-pink-50' : 'text-muted-foreground cursor-default'}`}
                    onClick={e => !profile?.instagram_url && e.preventDefault()}
                  >
                    <Instagram className="h-6 w-6 mx-auto mb-2" />
                    <span className="text-xs">Instagram</span>
                  </a>
                </div>
                <div className="text-center">
                  <a 
                    href={profile?.facebook_url || "#"} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`block p-4 rounded-md border ${profile?.facebook_url ? 'text-blue-600 hover:bg-blue-50' : 'text-muted-foreground cursor-default'}`}
                    onClick={e => !profile?.facebook_url && e.preventDefault()}
                  >
                    <Facebook className="h-6 w-6 mx-auto mb-2" />
                    <span className="text-xs">Facebook</span>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
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

      {/* Add Address Dialog */}
      <AddAddressDialog
        open={addAddressDialogOpen}
        onOpenChange={setAddAddressDialogOpen}
        onSubmit={handleAddAddress}
      />
    </div>
  );
};

export default ProfilePage;
