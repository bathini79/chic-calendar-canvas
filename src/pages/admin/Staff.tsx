import { useState } from "react";
import { useSupabaseCrud } from "@/hooks/use-supabase-crud";
import { StaffList } from "@/components/staff/StaffList";
import { StaffGrid } from "@/components/staff/StaffGrid";
import { StaffDialog } from "@/components/staff/StaffDialog";
import { HeaderActions } from "@/components/services/components/HeaderActions";
import { ViewToggle } from "@/components/services/components/ViewToggle";
import { SearchInput } from "@/components/services/components/SearchInput";
import { Tables } from "@/integrations/supabase/types";

export default function Staff() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Tables['employees']['Row'] | undefined>(undefined);

  const { data: employees, isLoading } = useSupabaseCrud<Tables['employees']['Row']>("employees");

  const handleEdit = (employee: Tables['employees']['Row']) => {
    setSelectedEmployee(employee);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setSelectedEmployee(undefined);
    setDialogOpen(false);
  };

  return (
    <div className="container space-y-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">Staff Management</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setDialogOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded"
          >
            Add Staff
          </button>
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <SearchInput value={searchQuery} onChange={setSearchQuery} />
      </div>

      {view === "grid" ? (
        <StaffGrid searchQuery={searchQuery} onEdit={handleEdit} />
      ) : (
        <StaffList searchQuery={searchQuery} onEdit={handleEdit} />
      )}

      <StaffDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={selectedEmployee}
      />
    </div>
  );
}