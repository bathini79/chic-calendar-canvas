import React, { useState, useEffect } from "react";
import { Link, Routes, Route, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmploymentTypesTable } from "@/components/admin/settings/EmploymentTypesTable"; 
import { PermissionsManager } from "@/components/admin/settings/PermissionsManager";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Team() {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState<string>("employment-types");
  const [isLoading, setIsLoading] = useState(true);
  const [employmentTypes, setEmploymentTypes] = useState<any[]>([]);

  useEffect(() => {
    fetchEmploymentTypes();
  }, []);

  const fetchEmploymentTypes = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("employment_types")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      // If no data was found, set the default employment types
      if (!data || data.length === 0) {
        await initializeDefaultEmploymentTypes();
        // Fetch again after initializing
        const { data: refreshedData, error: refreshError } = await supabase
          .from("employment_types")
          .select("*")
          .order("created_at", { ascending: true });
        
        if (refreshError) throw refreshError;
        setEmploymentTypes(refreshedData || []);
      } else {
        setEmploymentTypes(data);
      }
    } catch (error: any) {
      toast.error("Failed to load employment types: " + error.message);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeDefaultEmploymentTypes = async () => {
    try {
      const defaultTypes = [
        {
          name: "Stylist",
          description: "Provides services to customers",
          is_configurable: true,
          permissions: ["book_appointments", "view_own_schedule"]
        },
        {
          name: "Operations",
          description: "Manages daily operations",
          is_configurable: true,
          permissions: ["book_appointments", "view_all_schedules", "manage_inventory", "view_reports"]
        },
        {
          name: "Admin",
          description: "Has full access to the system",
          is_configurable: false,
          permissions: [] // Admin has all permissions by default
        }
      ];
      
      const { error } = await supabase
        .from("employment_types")
        .insert(defaultTypes);
        
      if (error) throw error;
      
      toast.success("Default employment types created successfully");
    } catch (error: any) {
      toast.error("Failed to create default employment types: " + error.message);
      console.error(error);
    }
  };

  return (
    <div className="container py-6 max-w-6xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild className="mr-2">
          <Link to="/admin/settings">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <div className="text-sm text-muted-foreground">
          Workspace settings • Team
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Team settings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div 
                className={`px-4 py-2 cursor-pointer ${activeSection === "employment-types" ? "bg-accent" : ""}`}
                onClick={() => setActiveSection("employment-types")}
              >
                <span>Employment types</span>
              </div>
              <div 
                className={`px-4 py-2 cursor-pointer ${activeSection === "permissions" ? "bg-accent" : ""}`}
                onClick={() => setActiveSection("permissions")}
              >
                <span>Permissions</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          {activeSection === "employment-types" && (
            <EmploymentTypesTable 
              employmentTypes={employmentTypes}
              isLoading={isLoading}
              onRefresh={fetchEmploymentTypes}
            />
          )}
          {activeSection === "permissions" && (
            <PermissionsManager 
              employmentTypes={employmentTypes}
              onRefresh={fetchEmploymentTypes}
            />
          )}
        </div>
      </div>
    </div>
  );
}