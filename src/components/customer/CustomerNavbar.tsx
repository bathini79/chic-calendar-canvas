
import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProfileMenu } from "@/components/customer/ProfileMenu";
import { MembershipStatus } from "@/components/customer/MembershipStatus";
import { cn } from "@/lib/utils";

interface CustomerNavbarProps {
  onCartClick: () => void;
}

export function CustomerNavbar({ onCartClick }: CustomerNavbarProps) {
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const { data: businessDetails } = useQuery({
    queryKey: ["businessDetails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_details")
        .select("*")
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <NavLink to="/services" className="text-xl font-bold">
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
            {session && <MembershipStatus customerId={session.user.id} />}
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
