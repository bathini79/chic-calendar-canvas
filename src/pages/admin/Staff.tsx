import { useState } from "react";
import { StaffDialog } from "@/components/staff/StaffDialog";
import { StaffGrid } from "@/components/staff/StaffGrid";
import { StaffList } from "@/components/staff/StaffList";
import { HeaderActions } from "@/components/staff/components/HeaderActions";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { Database } from "@/integrations/supabase/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaffShifts } from "@/components/staff/shifts/StaffShifts";

type ViewMode = "grid" | "list";
type Employee = Database['public']['Tables']['employees']['Row'];

export default function Staff() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<"staff" | "shifts">("staff");
  const [refreshKey, setRefreshKey] = useState(0); // Add a refresh key state
  const { data: employees, isLoading } = useSupabaseCrud<'employees'>('employees', refreshKey);

  // Make sure to handle the case where employeeId is undefined
  const handleOpenDialog = (employeeId?: string) => {
    try {
      setSelectedEmployeeId(employeeId || undefined);
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Error opening staff dialog:", error);
      // Prevent crashing by handling errors
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedEmployeeId(undefined);
    // Trigger a refresh by updating the refresh key
    setRefreshKey((prevKey) => prevKey + 1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-32">Loading...</div>;
  }

  return (
    <div className="container py-4 sm:py-6 space-y-4 px-2 sm:px-4">
      <Tabs 
        defaultValue="staff" 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as "staff" | "shifts")}
        className="w-full"
      >
        <div className="flex justify-between items-center mb-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="shifts">Shifts</TabsTrigger>
          </TabsList>
        </div>

        {activeTab === "staff" && (
          <div className="space-y-4">
            <HeaderActions 
              onAdd={() => handleOpenDialog()} 
              view={view} 
              onViewChange={setView}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
            />

            {view === "grid" ? (
              <StaffGrid 
                searchQuery={searchQuery}
                onEdit={handleOpenDialog}
              />
            ) : (
              <StaffList 
                searchQuery={searchQuery}
                onEdit={handleOpenDialog}
              />
            )}

            <StaffDialog 
              open={isDialogOpen} 
              onOpenChange={handleCloseDialog}
              employeeId={selectedEmployeeId}
              use2FactorVerification={true} // Enable 2Factor verification for new staff
            />
          </div>
        )}
        
        {activeTab === "shifts" && (
          <StaffShifts />
        )}
      </Tabs>
    </div>
  );
}
