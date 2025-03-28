
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  User, 
  CalendarClock, 
  Wallet, 
  Heart, 
  File, 
  Package, 
  Settings,
  LogOut
} from "lucide-react";
import { 
  Sidebar, 
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const ProfileSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  const menuItems = [
    {
      name: "Profile",
      path: "/profile/details",
      icon: User,
    },
    {
      name: "Appointments",
      path: "/profile",
      icon: CalendarClock,
    },
    {
      name: "Wallet",
      path: "/wallet",
      icon: Wallet,
    },
    {
      name: "Favourites",
      path: "/favourites",
      icon: Heart,
    },
    {
      name: "Forms",
      path: "/forms",
      icon: File,
    },
    {
      name: "Product Orders",
      path: "/orders",
      icon: Package,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: Settings,
    },
  ];

  return (
    <Sidebar variant="floating" className="border-r w-64">
      <SidebarHeader className="h-14 flex items-center px-4">
        <h2 className="font-bold text-lg">My Account</h2>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                asChild
                isActive={location.pathname === item.path}
              >
                <button 
                  onClick={() => navigate(item.path)}
                  className="w-full"
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <Separator />
        <div className="p-4">
          <button 
            onClick={handleSignOut}
            className="flex items-center space-x-2 text-sm w-full py-2 px-3 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
            <span>Log out</span>
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
