
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LocationDialog } from "./LocationDialog";

interface LocationHours {
  day_of_week: string;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  hours?: LocationHours[];
  receipt_settings?: {
    prefix: string;
    next_number: number;
  };
}

interface ReceiptSettingsFormData {
  prefix: string;
  next_number: number;
}

export function LocationDetails() {
  const { locationId } = useParams<{ locationId: string }>();
  const [location, setLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDialogMode, setEditDialogMode] = useState<"full" | "contact" | "receipt">("full");
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettingsFormData>({
    prefix: "",
    next_number: 1
  });
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [hoursDialogOpen, setHoursDialogOpen] = useState(false);
  
  const fetchLocationDetails = async () => {
    if (!locationId) return;
    
    try {
      setIsLoading(true);
      // Fetch location data
      const { data: locationData, error } = await supabase
        .from("locations")
        .select("*")
        .eq("id", locationId)
        .single();
        
      if (error) throw error;
      
      // Fetch receipt settings
      const { data: receiptData, error: receiptError } = await supabase
        .from("receipt_settings")
        .select("*")
        .eq("location_id", locationId)
        .single();
        
      if (receiptError && receiptError.code !== "PGRST116") { // Not found is ok
        throw receiptError;
      }
      
      // Map database information to the Location interface
      const mappedLocation: Location = {
        ...locationData,
        hours: [], // We'll implement this later
        receipt_settings: receiptData || { prefix: "", next_number: 1 }
      };
      
      setLocation(mappedLocation);
      
      if (receiptData) {
        setReceiptSettings({
          prefix: receiptData.prefix || "",
          next_number: receiptData.next_number || 1
        });
      }
    } catch (error: any) {
      toast.error("Failed to load location details: " + error.message);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchLocationDetails();
  }, [locationId]);
  
  const handleEditLocation = (mode: "full" | "contact" | "receipt" = "full") => {
    setEditDialogMode(mode);
    setEditDialogOpen(true);
  };
  
  const handleEditSuccess = () => {
    fetchLocationDetails();
    setEditDialogOpen(false);
    setReceiptDialogOpen(false);
  };
  
  const handleSaveReceiptSettings = async () => {
    if (!locationId) return;
    
    try {
      // Check if receipt settings already exist
      const { data, error: checkError } = await supabase
        .from("receipt_settings")
        .select("id")
        .eq("location_id", locationId);
        
      if (checkError) throw checkError;
      
      if (data && data.length > 0) {
        // Update existing settings
        const { error } = await supabase
          .from("receipt_settings")
          .update({
            prefix: receiptSettings.prefix,
            next_number: receiptSettings.next_number
          })
          .eq("location_id", locationId);
          
        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from("receipt_settings")
          .insert({
            location_id: locationId,
            prefix: receiptSettings.prefix,
            next_number: receiptSettings.next_number
          });
          
        if (error) throw error;
      }
      
      toast.success("Receipt settings updated successfully");
      fetchLocationDetails();
      setReceiptDialogOpen(false);
    } catch (error: any) {
      toast.error("Failed to update receipt settings: " + error.message);
      console.error(error);
    }
  };
  
  if (isLoading) {
    return <div className="p-8 text-center">Loading location details...</div>;
  }
  
  if (!location) {
    return <div className="p-8 text-center">Location not found</div>;
  }
  
  const fullAddress = [
    location.address,
    location.city,
    location.state,
    location.zip_code,
    location.country
  ].filter(Boolean).join(", ");
  
  // Generate business hours display for placeholder
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  return (
    <div className="container py-6 max-w-6xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild className="mr-2">
          <Link to="/admin/settings/business-setup">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <div className="text-sm text-muted-foreground">
          Workspace settings • Business setup • {location.name}
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{location.name}</h1>
        <Button variant="outline" onClick={() => handleEditLocation()}>
          <Edit2 className="h-4 w-4 mr-2" />
          Edit Location
        </Button>
      </div>
      
      {/* Get your business online section */}
      <Card className="mb-8 bg-primary text-primary-foreground">
        <CardContent className="pt-6 pb-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Get your business online</h2>
              <p>
                Increase your bookings by listing your business online on marketplaces and allow your clients to book 
                with you directly through your website and social media pages.
              </p>
              <Button variant="secondary" className="mt-4">
                Enable online listing
              </Button>
            </div>
            <div className="hidden md:block">
              {/* Placeholder for an illustration */}
              <div className="w-48 h-48 bg-primary-foreground/20 rounded-md"></div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Contact Details */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Contact details</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary" onClick={() => handleEditLocation("contact")}>
              Edit
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Location email address</div>
                <div>{location.email || "Not set"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Location contact number</div>
                <div>{location.phone || "Not set"}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Billing Details */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Billing details for client sales</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary" onClick={() => handleEditLocation()}>
              Edit
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              These details will appear on the client's sale receipt for sales from this location.
            </p>
            
            <div className="space-y-2">
              <div className="font-medium">Company details</div>
              <div>{location.name}</div>
              <div>{fullAddress}</div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Location */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Location</CardTitle>
          <Button variant="ghost" size="sm" className="text-primary" onClick={() => handleEditLocation()}>
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Business address</div>
              <div>{fullAddress}</div>
            </div>
            <div className="aspect-video bg-muted rounded-md w-full">
              {/* Placeholder for map */}
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                Map view would be displayed here
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Opening Hours */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Opening hours</CardTitle>
          <Button variant="ghost" size="sm" className="text-primary" onClick={() => setHoursDialogOpen(true)}>
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Opening hours for this location are default working hours for your team and will be visible to your clients. 
            You can amend business closed periods for events like Bank Holidays in Settings.
          </p>
          
          <div className="grid grid-cols-7 gap-2">
            {daysOfWeek.map((day) => {
              // Using placeholder data until we implement hours
              return (
                <div 
                  key={day} 
                  className={`p-4 rounded-md text-center ${
                    day === "Sunday" ? "bg-muted" : "bg-primary/10"
                  }`}
                >
                  <div className="font-medium mb-2">{day}</div>
                  {day === "Sunday" ? (
                    <div className="text-muted-foreground">Closed</div>
                  ) : (
                    <>
                      <div>{day === "Saturday" ? "9:00 AM" : "9:00 AM"}</div>
                      <div className="text-muted-foreground">-</div>
                      <div>{day === "Saturday" ? "5:00 PM" : "7:00 PM"}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 text-muted-foreground text-sm text-center">
            <p>Hours functionality will be fully implemented in the upcoming update.</p>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tax Defaults */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Tax defaults</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary">
              Edit
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Location tax settings for services and products.
            </p>
            
            <div className="space-y-4">
              <div>
                <div className="font-medium">Services</div>
                <div>GST (5%)</div>
              </div>
              <div>
                <div className="font-medium">Products</div>
                <div>No tax</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Receipt Sequencing */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Receipt sequencing</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary" onClick={() => setReceiptDialogOpen(true)}>
              Edit
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Receipt No. Prefix</div>
                <div>{location.receipt_settings?.prefix || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Next receipt number</div>
                <div>{location.receipt_settings?.next_number || "1"}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Location Dialog */}
      <LocationDialog
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        locationId={locationId}
        onSuccess={handleEditSuccess}
        mode={editDialogMode}
      />
      
      {/* Receipt Settings Dialog */}
      {receiptDialogOpen && (
        <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Receipt Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="prefix">Receipt No. Prefix</Label>
                <Input
                  id="prefix"
                  value={receiptSettings.prefix}
                  onChange={(e) => setReceiptSettings(prev => ({ ...prev, prefix: e.target.value }))}
                  placeholder="e.g. INV-"
                />
                <p className="text-xs text-muted-foreground">
                  This will appear before the receipt number (e.g., INV-0001)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="next_number">Next Receipt Number</Label>
                <Input
                  id="next_number"
                  type="number"
                  min="1"
                  value={receiptSettings.next_number}
                  onChange={(e) => setReceiptSettings(prev => ({ ...prev, next_number: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReceiptDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveReceiptSettings}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Hours Dialog - Placeholder */}
      {hoursDialogOpen && (
        <Dialog open={hoursDialogOpen} onOpenChange={setHoursDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Opening Hours</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-center text-muted-foreground">
                Hours functionality will be implemented in an upcoming update.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setHoursDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Add the missing imports
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

