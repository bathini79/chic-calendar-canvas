import { useState } from "react";
import { StaffDialog } from "@/components/staff/StaffDialog";
import { StaffGrid } from "@/components/staff/StaffGrid";
import { StaffList } from "@/components/staff/StaffList";
import { HeaderActions } from "@/components/staff/components/HeaderActions";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { Database } from "@/integrations/supabase/types";

type ViewMode = "grid" | "list";

export default function Staff() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("grid");
  const { data: employees, isLoading } = useSupabaseCrud('employees');

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container py-6 space-y-4">
      <HeaderActions 
        onAdd={() => setIsDialogOpen(true)} 
        view={view} 
        onViewChange={setView}
      />

      {view === "grid" ? (
        <StaffGrid employees={employees || []} />
      ) : (
        <StaffList employees={employees || []} />
      )}

      <StaffDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        onClose={() => setIsDialogOpen(false)}
      />
    </div>
  );
}