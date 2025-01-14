import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const CustomerDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="container mx-auto py-4 md:py-8 space-y-4 md:space-y-8 px-2 md:px-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Customer Dashboard</h1>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
      <div className="grid gap-4">
        <div className="p-6 border rounded-lg bg-card">
          <h2 className="text-xl font-semibold mb-4">Welcome to Your Dashboard</h2>
          <p className="text-muted-foreground">
            This is your customer dashboard. More features will be added soon.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;