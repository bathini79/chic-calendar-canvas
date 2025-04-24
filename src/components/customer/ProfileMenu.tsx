
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarClock, LogOut, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export function ProfileMenu() {
  const navigate = useNavigate();
  const [initials, setInitials] = useState("");
  
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (error) {
        console.error("Error fetching profile:", error);
        throw error;
      }
      
      return data;
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000, // Cache profile data for 5 minutes to prevent frequent refetches
  });

  const generateInitials = useCallback((fullName: string) => {
    if (!fullName) return "";
    
    return fullName
      .split(" ")
      .map(part => part.charAt(0))
      .join("")
      .toUpperCase();
  }, []);
  
  useEffect(() => {
    if (profile) {
      const fullName = profile.full_name || "";
      
      if (fullName) {
        // Generate initials from name
        setInitials(generateInitials(fullName));
      } else if (profile.email) {
        // If no name, use the first part of email
        const emailName = profile.email.split("@")[0];
        setInitials(emailName.charAt(0).toUpperCase());
      }
    }
  }, [profile, generateInitials]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/auth");
    }
  };

  if (sessionLoading || profileLoading || !session) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-8 w-8 bg-black text-primary-foreground cursor-pointer hover:opacity-90">
          {profile?.avatar_url ? (
            <AvatarImage src={profile.avatar_url} alt={profile.full_name || 'User'} />
          ) : (
            <AvatarFallback className="bg-black text-white">{initials}</AvatarFallback>
          )}
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{profile?.full_name || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">{profile?.phone_number}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/profile")}>
          <CalendarClock className="mr-2 h-4 w-4" />
          <span>My Appointments</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/profile/details")}>
          <User className="mr-2 h-4 w-4" />
          <span>My Profile</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
