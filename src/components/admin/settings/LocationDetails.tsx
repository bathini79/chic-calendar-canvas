import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Edit2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LocationDialog } from "./LocationDialog";
import { TaxDefaultsDialog } from "./TaxDefaultsDialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface LocationHours {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_closed: boolean;
  id?: string;
  location_id?: string;
}

interface TaxRate {
  id: string;
  name: string;
  percentage: number;
}

interface TaxSettings {
  service_tax_id: string | null;
  product_tax_id: string | null;
  service_tax?: TaxRate | null;
  product_tax?: TaxRate | null;
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
  tax_settings?: TaxSettings;
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
  const [editDialogMode, setEditDialogMode] = useState<"full" | "contact" | "receipt" | "billing" | "location">("full");
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettingsFormData>({
    prefix: "",
    next_number: 1
  });
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [taxDialogOpen, setTaxDialogOpen] = useState(false);
  const [locationHours, setLocationHours] = useState<LocationHours[]>([]);
  
  const fetchLocationDetails = async () => {
    if (!locationId) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      const { data: locationData, error } = await supabase
        .from("locations")
        .select("*")
        .eq("id", locationId)
        .single();
        
      if (error) throw error;
      
      const { data: hoursData, error: hoursError } = await supabase
        .from("location_hours")
        .select("*")
        .eq("location_id", locationId);
        
      if (hoursError) throw hoursError;
      
      const { data: receiptData, error: receiptError } = await supabase
        .from("receipt_settings")
        .select("*")
        .eq("location_id", locationId)
        .single();
        
      if (receiptError && receiptError.code !== "PGRST116") { // Not found is ok
        throw receiptError;
      }

      const { data: taxSettingsData, error: taxSettingsError } = await supabase
        .from("location_tax_settings")
        .select("*")
        .eq("location_id", locationId)
        .single();
        
      if (taxSettingsError && taxSettingsError.code !== "PGRST116") { // Not found is ok
        throw taxSettingsError;
      }

      let taxSettings: TaxSettings | undefined;
      
      if (taxSettingsData) {
        const serviceTaxId = taxSettingsData.service_tax_id;
        const productTaxId = taxSettingsData.product_tax_id;
        
        const [serviceTaxResponse, productTaxResponse] = await Promise.all([
          serviceTaxId ? supabase.from("tax_rates").select("*").eq("id", serviceTaxId).single() : Promise.resolve({data: null, error: null}),
          productTaxId ? supabase.from("tax_rates").select("*").eq("id", productTaxId).single() : Promise.resolve({data: null, error: null})
        ]);
        
        taxSettings = {
          ...taxSettingsData,
          service_tax: serviceTaxResponse?.data || null,
          product_tax: productTaxResponse?.data || null
        };
      }
      
      const mappedLocation: Location = {
        ...locationData,
        hours: hoursData || [],
        receipt_settings: receiptData || { prefix: "", next_number: 1 },
        tax_settings: taxSettings
      };
      
      setLocation(mappedLocation);
      setLocationHours(hoursData || []);
      
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
  
  const handleEditLocation = (mode: "full" | "contact" | "receipt" | "billing" | "location" = "full") => {
    setEditDialogMode(mode);
    setEditDialogOpen(true);
  };
  
  const handleEditSuccess = () => {
    fetchLocationDetails();
    setEditDialogOpen(false);
    setReceiptDialogOpen(false);
    setTaxDialogOpen(false);
  };
  
  const handleSaveReceiptSettings = async () => {
    if (!locationId) return;
    
    try {
      const { data, error: checkError } = await supabase
        .from("receipt_settings")
        .select("id")
        .eq("location_id", locationId);
        
      if (checkError) throw checkError;
      
      if (data && data.length > 0) {
        const { error } = await supabase
          .from("receipt_settings")
          .update({
            prefix: receiptSettings.prefix,
            next_number: receiptSettings.next_number
          })
          .eq("location_id", locationId);
          
        if (error) throw error;
      } else {
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
  
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const getServiceTaxDisplay = () => {
    if (location.tax_settings?.service_tax) {
      return `${location.tax_settings.service_tax.name} (${location.tax_settings.service_tax.percentage}%)`;
    }
    return "No tax";
  };

  const getProductTaxDisplay = () => {
    if (location.tax_settings?.product_tax) {
      return `${location.tax_settings.product_tax.name} (${location.tax_settings.product_tax.percentage}%)`;
    }
    return "No tax";
  };
  
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
              <div className="w-48 h-48 bg-primary-foreground/20 rounded-md"></div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Billing details for client sales</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary" onClick={() => handleEditLocation("billing")}>
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
      
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Location</CardTitle>
          <Button variant="ghost" size="sm" className="text-primary" onClick={() => handleEditLocation("location")}>
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
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                Map view would be displayed here
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Opening hours</CardTitle>
          <Button variant="ghost" size="sm" className="text-primary" onClick={() => handleEditLocation()}>
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Opening hours for this location are default working hours for your team and will be visible to your clients. 
            You can amend business closed periods for events like Bank Holidays in Settings.
          </p>
          
          <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
            {daysOfWeek.map((day, index) => {
              const dayHours = location.hours?.find(h => h.day_of_week === index);
              const isClosed = dayHours?.is_closed || false;
              
              return (
                <div 
                  key={day} 
                  className={`p-4 rounded-md text-center ${
                    isClosed ? "bg-muted" : "bg-primary/10"
                  }`}
                >
                  <div className="font-medium mb-2">{day}</div>
                  {isClosed ? (
                    <div className="text-muted-foreground">Closed</div>
                  ) : (
                    <>
                      <div>{dayHours?.start_time || "9:00"}</div>
                      <div className="text-muted-foreground">-</div>
                      <div>{dayHours?.end_time || "18:00"}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Tax defaults</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary" onClick={() => setTaxDialogOpen(true)}>
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
                <div>{getServiceTaxDisplay()}</div>
              </div>
              <div>
                <div className="font-medium">Products</div>
                <div>{getProductTaxDisplay()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
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
      
      <LocationDialog
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        locationId={locationId}
        onSuccess={handleEditSuccess}
        mode={editDialogMode}
      />
      
      <TaxDefaultsDialog
        isOpen={taxDialogOpen}
        onClose={() => setTaxDialogOpen(false)}
        locationId={locationId || ''}
        onSuccess={handleEditSuccess}
      />
      
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
    </div>
  );
}
