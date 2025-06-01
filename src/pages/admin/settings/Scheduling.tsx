import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ClosingDays from "@/components/admin/settings/ClosingDays";

export default function Scheduling() {
  const [showClosingDays, setShowClosingDays] = useState(false);

  // On desktop, show ClosingDays by default; on mobile, wait for user interaction
  const isDesktop = window.innerWidth >= 768;

  // If showClosingDays is true, render only ClosingDays
  if (showClosingDays) {
    return <ClosingDays />;
  }

  return (
    <div className="container py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        {/* Desktop Header (Back Button and Breadcrumb) */}
        <div className="hidden md:flex items-center">
          <Button variant="ghost" size="sm" asChild className="mr-2">
            <Link to="/admin/settings">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <div className="text-sm text-muted-foreground">
            Workspace settings • Scheduling
          </div>
        </div>

        {/* Mobile Header (Direct Navigation) */}
        <div className="md:hidden">
          <button
            onClick={() => setShowClosingDays(true)}
            className="text-sm text-gray-900 hover:underline p-1"
          >
            Closing Days
          </button>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar (Visible on Desktop) */}
        <div className="md:col-span-1 hidden md:grid">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Scheduling</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <button
                onClick={() => setShowClosingDays(true)}
                className={`block w-full text-left px-4 py-2 cursor-pointer hover:bg-accent`}
              >
                <span>Closing Days</span>
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content (Render ClosingDays on Desktop by Default) */}
        <div className="md:col-span-3 col-span-1">
          {isDesktop && <ClosingDays />}
        </div>
      </div>
    </div>
  );
}