import { useState, useEffect } from "react";
import { StaffDialog } from "@/components/staff/StaffDialog";
import { StaffGrid } from "@/components/staff/StaffGrid";
import { StaffList } from "@/components/staff/StaffList";
import { HeaderActions } from "@/components/staff/components/HeaderActions";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { Database } from "@/integrations/supabase/types";
import { StaffShifts } from "@/components/staff/shifts/StaffShifts";
import { Timesheets } from "@/components/staff/timesheets/Timesheets";
import { PayRuns } from "@/components/staff/pay/PayRuns";
import { TeamSidebar, TeamSection } from "@/components/staff/components/TeamSidebar";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

type ViewMode = "grid" | "list";
type Employee = Database['public']['Tables']['employees']['Row'];

export default function Staff() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>(undefined);
  const [activeSection, setActiveSection] = useState<TeamSection>("team-members");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: employees, isLoading } = useSupabaseCrud<'employees'>('employees', refreshKey);
  const isMobile = useIsMobile();

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

  const handleSectionChange = (section: TeamSection) => {
    setActiveSection(section);
    if (isMobile) {
      setShowMobileMenu(false);
    }
  };

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-32">Loading...</div>;
  }
  // Render the appropriate content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case "team-members":
        return (
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
            />
          </div>
        );
      case "scheduled-shifts":
        return <StaffShifts />;
      case "timesheets":
        return <Timesheets />;
      case "pay-runs":
        return <PayRuns />;
      default:
        return null;
    }
  };
    // Mobile view with content
  if (isMobile && !showMobileMenu) {
    return (
      <div className="container py-4 space-y-4 px-2">
        <div className="flex items-center mb-4 border-b pb-2 font-normal">
          <Button 
            variant="ghost" 
            className="mr-2 p-0 h-10 w-10 flex items-center justify-center" 
            onClick={toggleMobileMenu}
          >
            <ChevronLeft className="h-10 w-10" />
          </Button>
        </div>
        {renderContent()}
      </div>
    );
  }

  // Mobile menu view
  if (isMobile && showMobileMenu) {
    return (
      <div className="container py-4 px-2">
        <div className="flex items-center mb-4 border-b pb-2">
          <h1 className="text-xl font-medium">Staff Management</h1>
        </div>
        <TeamSidebar 
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          isMobile={true}
        />
      </div>
    );
  }
  // Desktop view
  return (
    <div className="container py-4 sm:py-6 px-2 sm:px-4">
      <div className="flex h-[calc(100vh-120px)]">
        {/* Team Sidebar */}
        <TeamSidebar 
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          isMobile={false}
        />
        
        {/* Main Content */}
        <div className="flex-1 p-4 overflow-y-auto bg-white rounded-sm">
         
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
