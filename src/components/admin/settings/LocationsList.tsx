
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function LocationsList() {
  // This is a placeholder component for the Locations section
  return (
    <>
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Locations</CardTitle>
            <CardDescription>
              Manage the physical locations of your business.
            </CardDescription>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No locations added yet.</p>
            <p>Add your first business location to get started.</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
