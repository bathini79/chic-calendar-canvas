
import { useState, useEffect } from "react";
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
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [initials, setInitials] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const { data: session, isLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  useEffect(() => {
    if (session?.user) {
      const email = session.user.email || "";
      setUserEmail(email);
      
      fetchUserProfile(session.user.id);
    }
  }, [session]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }
      
      if (data) {
        const fullName = data.full_name || "";
        
        if (fullName) {
          setUserName(fullName);
          // Generate initials from name
          const nameInitials = fullName
            .split(" ")
            .map(part => part.charAt(0))
            .join("")
            .toUpperCase();
          setInitials(nameInitials);
        } else {
          // If no name, use the first part of email
          const emailName = userEmail.split("@")[0];
          setUserName(emailName);
          setInitials(emailName.charAt(0).toUpperCase());
        }

        if (data.avatar_url) {
          setAvatarUrl(data.avatar_url);
        }
      }
    } catch (error) {
      console.error("Error in fetchUserProfile:", error);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/");
    }
  };

  if (isLoading || !session) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-8 w-8 bg-primary text-primary-foreground cursor-pointer hover:opacity-90">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={userName} />
          ) : (
            <AvatarFallback>{initials}</AvatarFallback>
          )}
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
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
