import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StaffGrid } from "@/components/staff/StaffGrid";
import { StaffList } from "@/components/staff/StaffList";

export default function Staff() {
  const [view, setView] = useState<"grid" | "list">("grid");

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <div>
          <Button onClick={() => setView("grid")} variant={view === "grid" ? "default" : "outline"}>
            Grid View
          </Button>
          <Button onClick={() => setView("list")} variant={view === "list" ? "default" : "outline"}>
            List View
          </Button>
        </div>
      </div>
      {view === "grid" ? <StaffGrid /> : <StaffList />}
    </div>
  );
}
