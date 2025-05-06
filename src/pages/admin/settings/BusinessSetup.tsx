import React, { useState } from "react";
import { Link, Routes, Route, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BusinessDetailsForm } from "@/components/admin/settings/BusinessDetailsForm";
import { LocationsList } from "@/components/admin/settings/LocationsList";
import { LocationDetails } from "@/components/admin/settings/LocationDetails";

export default function BusinessSetup() {
  const location = useLocation();
  const isLocationsDetailsPage = location.pathname.includes('/locations/');
  const [activeSection, setActiveSection] = useState<string>(
    isLocationsDetailsPage ? "locations" : 
    location.pathname.includes('locations') ? "locations" : "details"
  );

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
          Workspace settings • Business setup
        </div>
      </div>

      <Routes>
        <Route path="/" element={
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Business setup</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div 
                    className={`px-4 py-2 cursor-pointer ${activeSection === "details" ? "bg-accent" : ""}`}
                    onClick={() => setActiveSection("details")}
                  >
                    <span>Business details</span>
                  </div>
                  <div 
                    className={`px-4 py-2 cursor-pointer ${activeSection === "locations" ? "bg-accent" : ""}`}
                    onClick={() => setActiveSection("locations")}
                  >
                    <span>Locations</span>
                  </div>
                  
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-3">
              {activeSection === "details" && <BusinessDetailsForm />}
              {activeSection === "locations" && <LocationsList />}
            </div>
          </div>
        } />
        
        <Route path="/locations/:locationId" element={<LocationDetails />} />
      </Routes>
    </div>
  );
}
