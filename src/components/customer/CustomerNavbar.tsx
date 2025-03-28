
import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProfileMenu } from "@/components/customer/ProfileMenu";

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

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <NavLink to="/" className="text-xl font-bold">
              Salon
            </NavLink>
            <NavLink
              to="/services"
              className={({ isActive }) =>
                `transition-colors hover:text-primary ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              Services
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
