import React, { useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ClosingDays from "@/components/admin/settings/ClosingDays";

export default function Scheduling() {
  const [activeSection, setActiveSection] = useState("closing_days");
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
          Workspace settings • Scheduling
        </div>
      </div>

      <Routes>
        <Route
          path="/"
          element={
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Scheduling</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div
                      className={`px-4 py-2 cursor-pointer ${
                        activeSection === "closing_days" ? "bg-accent" : ""
                      }`}
                      onClick={() => setActiveSection("closing_days")}
                    >
                      <span>Closing Days</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="md:col-span-3">
                {activeSection === "closing_days" && <ClosingDays />}
              </div>
            </div>
          }
        />
      </Routes>
    </div>
  );
}
