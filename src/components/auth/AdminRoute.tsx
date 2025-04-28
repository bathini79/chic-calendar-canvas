import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      return data;
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!profile || (profile.role !== "admin" && profile.role !== "employee")) {
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
}