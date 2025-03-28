
import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProfileMenu } from "@/components/customer/ProfileMenu";
import { useIsMobile } from "@/hooks/use-mobile";

interface CustomerNavbarProps {
  onCartClick: () => void;
}

export function CustomerNavbar({ onCartClick }: CustomerNavbarProps) {
  const isMobile = useIsMobile();
  
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const { data: businessDetails, isLoading: isLoadingBusiness } = useQuery({
    queryKey: ["business_details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_details")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        console.error("Error loading business details:", error);
        return null;
      }
      return data;
    },
  });

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <NavLink to="/" className="text-xl font-bold flex items-center">
              {businessDetails?.logo_url ? (
                <img 
                  src={businessDetails.logo_url} 
                  alt="Business Logo" 
                  className="h-8 w-auto" 
                />
              ) : (
                "Salon"
              )}
            </NavLink>
          </div>
          <div className="flex items-center space-x-4">
            {session ? (
              <ProfileMenu />
            ) : (
              <Button variant="outline" asChild>
                <NavLink to="/auth">Sign In</NavLink>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
