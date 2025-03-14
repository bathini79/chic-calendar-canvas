
import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Memberships } from "./Sales/Memberships";
import { LoyaltyProgram } from "./Sales/LoyaltyProgram";
import { useLocation, useNavigate } from "react-router-dom";

export default function Sales() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<string>("memberships");

  React.useEffect(() => {
    const path = location.pathname;
    if (path.includes('/admin/settings/sales/loyalty')) {
      setActiveTab("loyalty");
    } else {
      setActiveTab("memberships");
    }
  }, [location]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "memberships") {
      navigate("/admin/settings/sales/memberships");
    } else if (value === "loyalty") {
      navigate("/admin/settings/sales/loyalty");
    }
  };

  return (
    <div className="container py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Sales Settings</h1>
        <p className="text-muted-foreground">
          Configure membership plans, loyalty programs, and payment settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="memberships">Memberships</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty Program</TabsTrigger>
        </TabsList>
        <TabsContent value="memberships">
          <Memberships />
        </TabsContent>
        <TabsContent value="loyalty">
          <LoyaltyProgram />
        </TabsContent>
      </Tabs>
    </div>
  );
}
