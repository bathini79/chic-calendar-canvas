import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function UserStatus() {
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session?.user?.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  if (!session) {
    return <div>Not logged in</div>;
  }

  return (
    <div className="space-y-2">
      <p>Email: {session.user.email}</p>
      <p>Role: {profile?.role || "Loading..."}</p>
    </div>
  );
}