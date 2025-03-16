
import { useState } from "react";
import { StaffDialog } from "@/components/staff/StaffDialog";
import { StaffGrid } from "@/components/staff/StaffGrid";
import { StaffList } from "@/components/staff/StaffList";
import { HeaderActions } from "@/components/staff/components/HeaderActions";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { Database } from "@/integrations/supabase/types";

type ViewMode = "grid" | "list";
type Employee = Database['public']['Tables']['employees']['Row'];

export default function Staff() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>(undefined);
  const { data: employees, isLoading } = useSupabaseCrud<'employees'>('employees');

  const handleOpenDialog = (employeeId?: string) => {
    setSelectedEmployeeId(employeeId);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedEmployeeId(undefined);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container py-6 space-y-4">
      <HeaderActions 
        onAdd={() => handleOpenDialog()} 
        view={view} 
        onViewChange={setView}
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
}
