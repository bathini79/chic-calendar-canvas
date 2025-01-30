import { useState } from "react";
import { SearchInput } from "@/components/services/components/SearchInput";
import { HeaderActions } from "@/components/services/components/HeaderActions";
import { StaffGrid } from "@/components/staff/StaffGrid";
import { StaffList } from "@/components/staff/StaffList";
import { StaffDialog } from "@/components/staff/StaffDialog";
import { ShiftPlanner } from "@/components/staff/ShiftPlanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Staff() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  const handleEdit = (staff: any) => {
    setSelectedStaff(staff);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedStaff(null);
    setDialogOpen(true);
  };

  return (
    <div className="w-full min-h-screen bg-background p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Staff Management</h1>
      </div>

      <Tabs defaultValue="staff" className="space-y-6">
        <TabsList>
          <TabsTrigger value="staff">Staff Members</TabsTrigger>
          <TabsTrigger value="planner">Shift Planner</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search staff..."
              />
            </div>
            <HeaderActions
              view={viewMode}
              onViewChange={setViewMode}
              onCreateClick={handleCreate}
              type="staff"
            />
          </div>

          {viewMode === 'grid' ? (
            <StaffGrid
              searchQuery={searchQuery}
              onEdit={handleEdit}
            />
          ) : (
            <StaffList
              searchQuery={searchQuery}
              onEdit={handleEdit}
            />
          )}
        </TabsContent>

        <TabsContent value="planner">
          <ShiftPlanner />
        </TabsContent>
      </Tabs>

      <StaffDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={selectedStaff}
      />
    </div>
  );
}