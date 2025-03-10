
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Building2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LocationDialog } from "./LocationDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  is_active: boolean;
}

export function LocationsList() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(undefined);
  const navigate = useNavigate();

  const fetchLocations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLocations(data || []);
    } catch (error: any) {
      toast.error("Failed to load locations: " + error.message);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleAddLocation = () => {
    setSelectedLocationId(undefined);
    setDialogOpen(true);
  };

  const handleEditLocation = (id: string) => {
    setSelectedLocationId(id);
    setDialogOpen(true);
  };

  const handleViewLocation = (id: string) => {
    navigate(`/admin/settings/business-setup/locations/${id}`);
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this location?")) return;

    try {
      const { error } = await supabase
        .from("locations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Location deleted successfully");
      fetchLocations();
    } catch (error: any) {
      toast.error("Failed to delete location: " + error.message);
      console.error(error);
    }
  };

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
          <Button onClick={handleAddLocation}>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-md">
                  <Skeleton className="h-12 w-12 rounded-md" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No locations added yet.</p>
              <p>Add your first business location to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {locations.map((location) => {
                // Format address for display
                const addressParts = [location.address];
                if (location.city) {
                  if (location.state) {
                    addressParts.push(`${location.city}, ${location.state}`);
                  } else {
                    addressParts.push(location.city);
                  }
                } else if (location.state) {
                  addressParts.push(location.state);
                }
                if (location.country) addressParts.push(location.country);
                
                return (
                  <div
                    key={location.id}
                    className="flex items-start space-x-4 p-4 border rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => handleViewLocation(location.id)}
                  >
                    <div className="flex-shrink-0 h-16 w-16 bg-primary/10 rounded-md flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="font-medium text-lg">{location.name}</h3>
                        {location.is_active && (
                          <div className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                            Active
                          </div>
                        )}
                      </div>
                      <p className="text-muted-foreground">
                        {addressParts.join(", ")}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">No reviews yet</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleViewLocation(location.id);
                        }}>
                          View details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleEditLocation(location.id);
                        }}>
                          Edit location
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLocation(location.id);
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <LocationDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        locationId={selectedLocationId}
        onSuccess={fetchLocations}
      />
    </>
  );
}
